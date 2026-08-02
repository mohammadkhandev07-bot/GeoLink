'use client'

import { SharedPostMessage } from './SharedPostMessage'
import { SharedStoryMessage } from './SharedStoryMessage'
import { AperonixReplyMessage } from './AperonixReplyMessage'
import { Message } from '@/lib/types/database.types'
import { formatTimeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
  onDelete?: (messageId: string) => void
}

export function ChatMessage({ message, isOwn, onDelete }: ChatMessageProps) {
  if ((message as any).post_id) {
    return (
      <div className={cn('flex gap-2 mb-3', isOwn && 'flex-row-reverse')}>
        <div className="max-w-[75%]">
          <SharedPostMessage postId={(message as any).post_id} />
          <p className={cn('text-[10px] mt-1', isOwn ? 'text-right text-muted-foreground' : 'text-muted-foreground')}>
            {formatTimeAgo(message.created_at)}
            {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
          </p>
        </div>
      </div>
    )
  }

  if ((message as any).story_id) {
    return (
      <div className={cn('flex gap-2 mb-3', isOwn && 'flex-row-reverse')}>
        <div>
          <SharedStoryMessage storyId={(message as any).story_id} content={message.content} isOwn={isOwn} />
          <p className={cn('text-[10px] mt-1', isOwn ? 'text-right text-muted-foreground' : 'text-muted-foreground')}>
            {formatTimeAgo(message.created_at)}
            {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
          </p>
        </div>
      </div>
    )
  }

  if ((message as any).is_aperonix_reply) {
    return (
      <div className={cn('flex gap-2 mb-3', isOwn && 'flex-row-reverse')}>
        <div>
          <AperonixReplyMessage content={message.content} isOwn={isOwn} />
          <p className={cn('text-[10px] mt-1', isOwn ? 'text-right text-muted-foreground' : 'text-muted-foreground')}>
            {formatTimeAgo(message.created_at)}
            {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2 mb-2', isOwn && 'flex-row-reverse')}>
      <div className={cn(
        'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
        isOwn
          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm'
          : 'bg-muted rounded-bl-sm'
      )}>
        <p>{message.content}</p>
        <p className={cn('text-[10px] mt-0.5', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
          {formatTimeAgo(message.created_at)}
          {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
        </p>
      </div>
    </div>
  )
}
