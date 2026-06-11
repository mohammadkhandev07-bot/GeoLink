'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MessageInputProps {
  onSend: (content: string) => void
  onTyping: () => void
  disabled?: boolean
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t bg-background"
    >
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
  )
}
