# Financial Search Engine

A real-time financial information assistant that provides stock data and relevant news using natural language queries. The system combines market data from Alpha Vantage with news from NewsAPI, processed through OpenAI's GPT model to deliver contextual financial insights.

## Architecture 
mermaid
graph TD
A[Next.js Frontend] --> B[API Route Handler]
B --> C[OpenAI GPT-3.5]
C --> D[News Tool]
C --> E[Stock Tool]
D --> F[NewsAPI]
E --> G[Alpha Vantage API]
C --> H[Response Formatter]
H --> A

## Key Features
- Real-time stock price data
- Contextual financial news analysis
- Natural language query processing
- Structured response formatting
- Rate-limited API calls for efficiency

## Dependencies
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **APIs**:
  - Alpha Vantage: Real-time stock market data
  - NewsAPI: Financial news aggregation
  - OpenAI GPT-3.5: Natural language processing
- **Key Libraries**:
  - LangChain: AI agent orchestration
  - shadcn/ui: UI components

## Setup
1. Clone the repository
2. Install dependencies:
bash
npm install
3. Create `.env` file with required API keys:
4. Run development server:
bash
npm run dev

## Usage
- Enter natural language queries about stocks or companies
- Example queries:
  - "What's the latest news about Google and its stock price?"
  - "How is Apple performing today?"
  - "Tell me about Tesla's recent market performance"

## API Rate Limits
- Alpha Vantage: 5 calls per minute
- NewsAPI: 100 calls per day
- OpenAI: Varies by subscription

## Local Development
The project runs on http://localhost:3000 by default. Ensure all API keys are properly configured in the `.env` file before running.

## License
MIT