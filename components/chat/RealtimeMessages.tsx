'use client'

import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { Message } from '@/lib/types/database.types'

interface RealtimeMessagesProps {
  messages: Message[]
  currentUserId: string
  isTyping: boolean
  otherUsername?: string
  onReply?: (message: Message) => void
  onRemoveMessage?: (messageId: string) => void
  onPatchMessage?: (messageId: string, patch: Partial<Message>) => void
  isMessageUnavailable?: (senderId: string) => boolean
  wallpaperUrl?: string | null
  wallpaperPosition?: { x: number; y: number }
}

export function RealtimeMessages({ messages, currentUserId, isTyping, otherUsername, onReply, onRemoveMessage, onPatchMessage, isMessageUnavailable, wallpaperUrl, wallpaperPosition }: RealtimeMessagesProps) {
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
  // Typing dots appear) AND the person is already near the bottom - not on
  // Every re-render, which used to yank them back down while they were
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
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 bg-no-repeat"
      style={
        wallpaperUrl
          ? {
              backgroundImage: `url(${wallpaperUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: `${wallpaperPosition?.x ?? 50}% ${wallpaperPosition?.y ?? 50}%`,
            }
          : undefined
      }
    >
      {localMessages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === currentUserId}
          currentUserId={currentUserId}
          otherUsername={otherUsername}
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
