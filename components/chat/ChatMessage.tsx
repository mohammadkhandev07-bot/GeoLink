'use client'

import { useState } from 'react'
import { MoreVertical, Trash2 } from 'lucide-react'
import { Message } from '@/lib/types/database.types'
import { formatTimeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
  onDelete?: (messageId: string) => void
}

export function ChatMessage({ message, isOwn, onDelete }: ChatMessageProps) {
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return
    setDeleting(true)

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message.id)
      .eq('sender_id', (await supabase.auth.getUser()).data.user?.id ?? '')

    if (error) {
      console.error('Delete error:', error)
      alert('Could not delete message: ' + error.message)
      setDeleting(false)
      return
    }

    setDeleted(true)
    onDelete?.(message.id)
    setDeleting(false)
  }

  if (deleted) return null

  return (
    <div className={cn('flex gap-1 mb-2 group items-end', isOwn && 'flex-row-reverse')}>
      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[70%] px-3 py-2 rounded-2xl text-sm',
          isOwn
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-sm'
            : 'bg-muted rounded-bl-sm',
          deleting && 'opacity-50'
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

      {/* 3 dot menu */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground">
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwn ? 'end' : 'start'} side="top">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2 cursor-pointer text-xs"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? 'Deleting...' : 'Delete Message'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
