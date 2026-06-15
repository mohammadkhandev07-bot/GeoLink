'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { Message } from '@/lib/types/database.types'

interface RealtimeMessagesProps {
  messages: Message[]
  currentUserId: string
  isTyping: boolean
}

export function RealtimeMessages({ messages, currentUserId, isTyping }: RealtimeMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)

  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, isTyping])

  const handleDelete = (messageId: string) => {
    setLocalMessages(prev => prev.filter(m => m.id !== messageId))
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {localMessages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === currentUserId}
          onDelete={handleDelete}
        />
      ))}
      {isTyping && (
        <div className="flex gap-1 items-center px-3 py-2 bg-muted rounded-2xl rounded-bl-sm w-fit mb-2">
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
