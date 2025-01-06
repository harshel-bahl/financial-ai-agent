"use client"

import { useEffect, useRef, useState } from "react"
import { IconBrandOpenai, IconUser } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setMessages(prev => [...prev, { role: "user", content: query }])

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      })

      if (!response.ok) {
        throw new Error(response.statusText)
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }])
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "An error occurred while fetching the response." }])
    } finally {
      setLoading(false)
      setQuery("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <div ref={chatContainerRef} className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[80%] items-start gap-3 rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {message.role === "assistant" ? (
                  <IconBrandOpenai className="h-5 w-5 mt-1" />
                ) : (
                  <IconUser className="h-5 w-5 mt-1" />
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </p>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] items-start gap-3 rounded-lg bg-muted p-4">
                <IconBrandOpenai className="h-5 w-5 mt-1 animate-pulse" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">AI Assistant</p>
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto relative">
          <Input
            ref={inputRef}
            className="pr-20"
            placeholder="Ask about stocks, market news..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="absolute right-1 top-1 h-8"
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
