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
  onCallAgain?: () => void
  isMessageUnavailable?: (senderId: string) => boolean
  wallpaperUrl?: string | null
  wallpaperPosition?: { x: number; y: number }
}

export function RealtimeMessages({ messages, currentUserId, isTyping, otherUsername, onReply, onRemoveMessage, onPatchMessage, onCallAgain, isMessageUnavailable, wallpaperUrl, wallpaperPosition }: RealtimeMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const hasDoneInitialScrollRef = useRef(false)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)

  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  const isNearBottom = () => {
    const el = containerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }

  // The very first time this conversation has messages to show, jump
  // straight to the bottom (latest message) instantly - no animation, no
  // "already near bottom" check. Without this, opening a long chat left
  // you looking at the oldest messages and having to scroll all the way
  // down yourself, unlike every other chat app.
  useEffect(() => {
    if (hasDoneInitialScrollRef.current) return
    if (localMessages.length === 0) return
    hasDoneInitialScrollRef.current = true
    lastMessageIdRef.current = localMessages[localMessages.length - 1]?.id ?? null
    // Wait a tick so the messages have actually painted (and images/media
    // have laid out) before measuring scrollHeight, or this can land short.
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
    })
  }, [localMessages])

  // Only jumps to the bottom when there's an actual new message (or the
  // Typing dots appear) AND the person is already near the bottom - not on
  // Every re-render, which used to yank them back down while they were
  // scrolled up reading older messages.
  useEffect(() => {
    if (!hasDoneInitialScrollRef.current) return
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
          onCallAgain={onCallAgain}
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
