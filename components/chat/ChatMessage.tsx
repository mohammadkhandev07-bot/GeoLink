'use client'

import { Message } from '@/lib/types/database.types'
import { formatTimeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  return (
    <div className={cn('flex gap-2 mb-2', isOwn && 'flex-row-reverse')}>
      <div
        className={cn(
          'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
          isOwn
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm'
            : 'bg-muted rounded-bl-sm'
        )}
      >
        <p>{message.content}</p>
        <p className={cn(
          'text-[10px] mt-0.5',
          isOwn ? 'text-white/70' : 'text-muted-foreground'
        )}>
          {formatTimeAgo(message.created_at)}
          {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
        </p>
      </div>
    </div>
  )
}
