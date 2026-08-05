'use client'

import { useEffect, useState } from 'react'
import { Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Message } from '@/lib/types/database.types'

interface MessageInputProps {
  onSend: (content: string, replyToId?: string | null) => void
  onTyping: () => void
  disabled?: boolean
  replyingTo?: Message | null
  onCancelReply?: () => void
}

export function MessageInput({ onSend, onTyping, disabled, replyingTo, onCancelReply }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim(), replyingTo?.id)
      setMessage('')
      onCancelReply?.()
    }
  }

  return (
    <div className="border-t bg-background">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-pink-500">Replying to</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <button onClick={onCancelReply} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
        <Input
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            onTyping()
          }}
          placeholder="Type a message..."
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled}
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
