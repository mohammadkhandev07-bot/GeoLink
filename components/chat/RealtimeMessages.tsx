'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { Message } from '@/lib/types/database.types'

interface RealtimeMessagesProps {
  messages: Message[]
  currentUserId: string
  isTyping: boolean
  onReply?: (message: Message) => void
  onRemoveMessage?: (messageId: string) => void
  onPatchMessage?: (messageId: string, patch: Partial<Message>) => void
  isMessageUnavailable?: (senderId: string) => boolean
}

export function RealtimeMessages({ messages, currentUserId, isTyping, onReply, onRemoveMessage, onPatchMessage, isMessageUnavailable }: RealtimeMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)

  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  const isNearBottom = () => {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }

  // Only jumps to the bottom when there's an actual new message (or the
  // typing dots appear) AND the person is already near the bottom - not on
  // every re-render, which used to yank them back down while they were
  // scrolled up reading older messages.
  useEffect(() => {
    const lastMsg = localMessages[localMessages.length - 1]
    const isNewMessage = !!lastMsg && lastMsg.id !== lastMessageIdRef.current
    lastMessageIdRef.current = lastMsg?.id ?? null

    if ((isNewMessage || isTyping) && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [localMessages, isTyping])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      {localMessages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === currentUserId}
          currentUserId={currentUserId}
          onReply={onReply}
          onRemoveMessage={onRemoveMessage}
          onPatchMessage={onPatchMessage}
          unavailable={isMessageUnavailable?.(msg.sender_id)}
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
