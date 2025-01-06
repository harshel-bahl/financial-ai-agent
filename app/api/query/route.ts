// app/api/query/route.ts

import { NextRequest, NextResponse } from "next/server";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";
import { DynamicTool } from "langchain/tools";
import { JSDOM } from 'jsdom';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    let newsCallCount = 0;
    let stockCallCount = 0;
    const MAX_TOOL_CALLS = 2;

    const fetchStock = async (q: string) => {
      if (stockCallCount >= 1) {
        return "Stock data has already been retrieved. Use existing data for analysis.";
      }
      stockCallCount++;
      
      const symbolMatch = q.match(/\b[A-Z]{1,5}\b/g) || [];
      if (!symbolMatch.length && !/s&p|sp500|market/i.test(q)) {
        return "No specific stock symbols found to search";
      }

      const symbol = /s&p|sp500|market/i.test(q) ? "SPY" : symbolMatch[0];
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
      const r = await fetch(url);
      if (!r.ok) return `Error ${r.status}`;
      const data = await r.json();
      const ts = data["Time Series (5min)"] || {};
      const keys = Object.keys(ts).sort().reverse();
      if (!keys.length) return "No data";
      return `Data for ${symbol} at ${keys[0]}: ${JSON.stringify(ts[keys[0]])}`;
    }

    const fetchNews = async (q: string) => {
      if (newsCallCount >= 1) {
        return "News has already been checked. Use existing data or proceed to stock analysis.";
      }
      newsCallCount++;
      
      const everythingUrl = new URL('https://newsapi.org/v2/everything');
      everythingUrl.searchParams.append('q', `"${q}" AND (company OR earnings OR stock)`);
      everythingUrl.searchParams.append('sortBy', 'relevancy');
      everythingUrl.searchParams.append('language', 'en');
      everythingUrl.searchParams.append('pageSize', '5');
      everythingUrl.searchParams.append('sources', 'reuters,bloomberg,cnbc,business-insider,financial-times,the-wall-street-journal');
      everythingUrl.searchParams.append('apiKey', process.env.NEWS_API_KEY || '');
    
      try {
        const response = await fetch(everythingUrl.toString());
        if (!response.ok) {
          throw new Error(`NewsAPI returned ${response.status}`);
        }
        
        let newsData = await response.json();
        
        if (!newsData.articles?.length) {
            
          const everythingUrl = new URL('https://newsapi.org/v2/everything');
          everythingUrl.searchParams.append('q', `${q} AND (business OR finance OR technology)`);
          everythingUrl.searchParams.append('sortBy', 'relevancy');
          everythingUrl.searchParams.append('language', 'en');
          everythingUrl.searchParams.append('pageSize', '5');
          everythingUrl.searchParams.append('sources', 'reuters,bloomberg,cnbc,business-insider,financial-times,the-wall-street-journal');
          everythingUrl.searchParams.append('apiKey', process.env.NEWS_API_KEY || '');
        
          const fallbackResponse = await fetch(everythingUrl.toString());

          if (!fallbackResponse.ok) {
            throw new Error(`NewsAPI returned ${fallbackResponse.status}`);
          }
          const fallbackData = await fallbackResponse.json();
          console.log(fallbackData);
          if (!fallbackData.articles?.length) {
            return "No recent news found";
          }
          newsData = fallbackData;
        }
        
        return newsData.articles
          .slice(0, 3)
          .map((article: any, i: number) => {
            const title = article.title.replace(/\[.*?\]|\(.*?\)/g, '').trim();
            const description = article.description?.replace(/\[.*?\]|\(.*?\)/g, '').trim() || '';
            return `${i + 1}. ${title} from ${article.source.name}${description ? ': ' + description : ''}`;
          })
          .filter((text: string) => text.length > 0)
          .join("\n\n");

      } catch (error) {
        console.error('NewsAPI Error:', error);
        return `Error retrieving news: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    const tools = [
      new DynamicTool({
        name: "newsTool",
        description: "ALWAYS use this first to get latest financial news and identify relevant stock symbols.",
        func: fetchNews
      }),
      new DynamicTool({
        name: "stockTool",
        description: "Use this only when specific stock symbols are mentioned (like AAPL, GOOGL) or when analyzing market indices (S&P500).",
        func: fetchStock
      })
    ];

    const model = new ChatOpenAI({
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo-16k",
      maxTokens: 10000,
      presencePenalty: 0.5,
      frequencyPenalty: 0.3
    });

    const executor = await initializeAgentExecutorWithOptions(
      tools,
      model,
      {
        agentType: "structured-chat-zero-shot-react-description",
        verbose: true,
        maxIterations: 5,
        handleParsingErrors: true,
        returnIntermediateSteps: true,
        agentArgs: {
          prefix: `You are a financial analyst. CRITICAL INSTRUCTIONS FOR COMPANY QUERIES:

1. FOR EVERY COMPANY QUESTION:
   - FIRST: Use newsTool to get latest news SPECIFICALLY about the company in question
   - THEN: Use stockTool to get current price data for that specific company
   - Ensure the correct stock ticker symbol is used. For example, use "GOOG" for Google, not "GOOGLE".
   - If no RELEVANT news is found about the company, state that clearly
   - If no stock data is found, state that clearly
   - DO NOT include unrelated news or make connections to unrelated events

2. EVERY RESPONSE MUST INCLUDE:
   - Latest stock prices (only if found)
   - Only news that DIRECTLY relates to the company in question
   - Clear indication if no relevant news or stock data was found

3. ANSWER FORMAT:
   If both news and stock data are found:
   "[Company] is currently trading at $X.XX [include price movement]. Recent company-specific news indicates [summarize ONLY directly related news]."

   If no relevant news is found:
   "[Company] is currently trading at $X.XX [include price movement]. No significant company-specific news was found in the recent period."

   If no stock data is found:
   "Unable to retrieve current stock data for [Company]. [Include any relevant company-specific news if found]."

4. QUALITY CHECKS:
   - Never include news about other companies unless they directly involve the queried company
   - Don't make speculative connections between general industry news and the company
   - If the news articles aren't about the specific company, say "No recent company-specific news found"
   - Never show placeholder stock prices - only show prices when actual data is available

REMEMBER: Only include information that is DIRECTLY related to the queried company. Do not speculate or include tangential information.`,
        }
      }
    );

    const result = await executor.call({ 
      input: query,
      timeout: 30000
    });

    let finalAnswer = result.output;
    if ('intermediateSteps' in result && Array.isArray(result.intermediateSteps)) {
      const lastStep = result.intermediateSteps[result.intermediateSteps.length - 1];
      if (lastStep?.action?.action === "Final Answer") {
        finalAnswer = lastStep.action.action_input;
      }
    }

    return NextResponse.json({ answer: finalAnswer });
  } catch (error) {
    return NextResponse.json({ 
      answer: "Unable to process request. Please try again with a specific stock symbol or news query." 
    }, { status: 500 });
  }
}
