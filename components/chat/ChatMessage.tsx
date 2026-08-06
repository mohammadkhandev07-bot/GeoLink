'use client'

import { useRef, useState } from 'react'
import { MoreVertical, Reply as ReplyIcon, Smile, Pencil, Trash2, EyeOff, Copy, Volume2, Square, Forward, Check } from 'lucide-react'
import { SharedPostMessage } from './SharedPostMessage'
import { SharedStoryMessage } from './SharedStoryMessage'
import { AperonixReplyMessage } from './AperonixReplyMessage'
import { MessageForwardModal } from './MessageForwardModal'
import { VoiceMessagePlayer } from './VoiceMessagePlayer'
import { FullEmojiPicker } from './FullEmojiPicker'
import { Message } from '@/lib/types/database.types'
import { formatTimeAgo } from '@/lib/utils/helpers'
import { cn } from '@/lib/utils/helpers'
import { getClampedPopupPosition } from '@/lib/utils/popupPosition'
import {
  useUnsendMessage,
  useDeleteMessageForMe,
  useEditMessage,
  useMessageReactions,
  useSetMessageReaction,
  useRemoveMessageReaction,
  useReplyPreview,
} from '@/lib/hooks/useMessageActions'
import { speakText, stopSpeaking } from '@/lib/utils/voice'

interface ChatMessageProps {
  message: Message
  isOwn: boolean
  currentUserId: string
  onReply?: (message: Message) => void
  onRemoveMessage?: (messageId: string) => void
  onPatchMessage?: (messageId: string, patch: Partial<Message>) => void
}

const MENU_WIDTH = 192
const MENU_HEIGHT = 260
const EMOJI_WIDTH = 288
const EMOJI_HEIGHT = 288

export function ChatMessage({ message, isOwn, currentUserId, onReply, onRemoveMessage, onPatchMessage }: ChatMessageProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showForward, setShowForward] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [emojiPos, setEmojiPos] = useState<{ top: number; left: number } | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const emojiBtnRef = useRef<HTMLButtonElement>(null)

  const unsendMessage = useUnsendMessage()
  const deleteForMe = useDeleteMessageForMe()
  const editMessage = useEditMessage()
  const { data: reactions = [] } = useMessageReactions(message.id)
  const setReaction = useSetMessageReaction()
  const removeReaction = useRemoveMessageReaction()
  const { data: replyPreview } = useReplyPreview((message as any).reply_to_id)

  const myReaction = reactions.find(r => r.user_id === currentUserId)

  // Both popups are viewport-clamped (never spill off the edge of the
  // screen, flip upward if there's no room below) - essential on mobile
  // where a long message can push the button close to the bottom edge.
  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect()
    if (rect) setMenuPos(getClampedPopupPosition(rect, MENU_WIDTH, MENU_HEIGHT))
    setShowMenu(v => !v)
  }

  const openEmojiPicker = () => {
    const rect = emojiBtnRef.current?.getBoundingClientRect()
    if (rect) setEmojiPos(getClampedPopupPosition(rect, EMOJI_WIDTH, EMOJI_HEIGHT))
    setShowEmojiPicker(v => !v)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
    setShowMenu(false)
  }

  const handleRead = async () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setShowMenu(false)
    setSpeaking(true)
    await speakText(message.content, () => setSpeaking(false))
  }

  // Each action updates the local list immediately (so the person acting
  // sees it happen instantly) alongside the actual database mutation - the
  // other participant gets the same result moments later via realtime.
  const handleUnsend = () => {
    setShowMenu(false)
    onRemoveMessage?.(message.id)
    unsendMessage.mutate({ messageId: message.id, chatId: message.chat_id })
  }

  const handleDeleteForMe = () => {
    setShowMenu(false)
    onRemoveMessage?.(message.id)
    deleteForMe.mutate({ messageId: message.id, chatId: message.chat_id, isSender: isOwn })
  }

  const handleSaveEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === message.content) { setEditing(false); return }
    onPatchMessage?.(message.id, { content: trimmed, is_edited: true } as Partial<Message>)
    editMessage.mutate({ messageId: message.id, content: trimmed, chatId: message.chat_id })
    setEditing(false)
  }

  const handleReact = (emoji: string) => {
    setShowEmojiPicker(false)
    if (myReaction?.emoji === emoji) {
      removeReaction.mutate({ messageId: message.id, userId: currentUserId })
    } else {
      setReaction.mutate({ messageId: message.id, userId: currentUserId, emoji })
    }
  }

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
    <div className={cn('flex gap-1 mb-2 group items-center', isOwn && 'flex-row-reverse')}>
      <div className="max-w-[70%] flex flex-col" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {replyPreview && (
          <div className="text-[11px] px-2.5 py-1 rounded-t-xl border-l-2 border-pink-500 bg-muted/60 mb-[-2px] max-w-full truncate">
            <span className="font-semibold text-pink-500">{replyPreview.profiles?.username}</span>{' '}
            <span className="text-muted-foreground">{replyPreview.content}</span>
          </div>
        )}

        {editing ? (
          <div className="w-full flex flex-col gap-1.5" style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
            <textarea
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEdit() }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={2}
              className="w-full rounded-2xl px-3 py-2 text-sm bg-muted border border-pink-500 outline-none resize-none"
            />
            <div className="flex items-center gap-2">
              <button onClick={() => setEditing(false)} className="text-xs px-2.5 py-1 rounded-full text-muted-foreground hover:bg-muted">Cancel</button>
              <button onClick={handleSaveEdit} className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium">Save</button>
            </div>
          </div>
        ) : (message as any).sticker ? (
          <div className="text-6xl leading-none px-1">{(message as any).sticker}</div>
        ) : (message as any).media_type === 'audio' ? (
          <div className={cn(
            'px-3 py-2',
            isOwn
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-muted rounded-2xl rounded-bl-sm',
            replyPreview && 'rounded-tl-none rounded-tr-none'
          )}>
            <VoiceMessagePlayer url={(message as any).media_url} durationSeconds={(message as any).media_duration_seconds} isOwn={isOwn} />
            <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
              {formatTimeAgo(message.created_at)}
              {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
            </p>
          </div>
        ) : ((message as any).media_type === 'image' || (message as any).media_type === 'video') ? (
          <div className={cn('rounded-2xl overflow-hidden max-w-[240px]', isOwn ? 'rounded-br-sm' : 'rounded-bl-sm', replyPreview && 'rounded-tl-none rounded-tr-none')}>
            {(message as any).media_type === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(message as any).media_url} alt="Photo" className="w-full max-h-72 object-cover" />
            ) : (
              <video src={(message as any).media_url} controls className="w-full max-h-72" />
            )}
            {message.content && (
              <div className={cn('px-3 py-2 text-sm', isOwn ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-muted')}>
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            )}
            <p className={cn(
              'text-[10px] px-3 py-1',
              isOwn ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white/70' : 'bg-muted text-muted-foreground'
            )}>
              {formatTimeAgo(message.created_at)}
              {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
            </p>
          </div>
        ) : (
          <div className={cn(
            'px-3 py-2 text-sm max-w-full break-words',
            isOwn
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-muted rounded-2xl rounded-bl-sm',
            replyPreview && 'rounded-tl-none rounded-tr-none'
          )}>
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <p className={cn('text-[10px] mt-0.5 flex items-center gap-1', isOwn ? 'text-white/70' : 'text-muted-foreground')}>
              {(message as any).is_edited && <span className="italic">Edited ·</span>}
              {formatTimeAgo(message.created_at)}
              {isOwn && (message.is_read ? ' · Seen' : ' · Sent')}
            </p>
          </div>
        )}

        {reactions.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {Object.entries(
              reactions.reduce((acc: Record<string, number>, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc }, {})
            ).map(([emoji, count]) => (
              <span key={emoji} className="text-xs bg-muted rounded-full px-1.5 py-0.5 border border-border">
                {emoji} {count > 1 ? count : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
          <button ref={menuBtnRef} onClick={openMenu} className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <MoreVertical className="h-4 w-4" />
          </button>

          <button onClick={() => onReply?.(message)} className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <ReplyIcon className="h-4 w-4" />
          </button>

          <button ref={emojiBtnRef} onClick={openEmojiPicker} className="p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <Smile className="h-4 w-4" />
          </button>
        </div>
      )}

      {showMenu && menuPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-40 bg-card border rounded-xl shadow-xl overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
          >
            {isOwn && (
              <button onClick={() => { setShowMenu(false); setEditing(true) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button onClick={handleCopy} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} Copy
            </button>
            <button onClick={handleRead} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted">
              {speaking ? <Square className="h-3.5 w-3.5 fill-current text-pink-500" /> : <Volume2 className="h-3.5 w-3.5" />} {speaking ? 'Stop' : 'Read aloud'}
            </button>
            <button onClick={() => { setShowMenu(false); setShowForward(true) }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted">
              <Forward className="h-3.5 w-3.5" /> Forward
            </button>
            <button onClick={handleDeleteForMe} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted">
              <EyeOff className="h-3.5 w-3.5" /> Delete for me
            </button>
            {isOwn && (
              <button onClick={handleUnsend} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" /> Unsend
              </button>
            )}
          </div>
        </>
      )}

      {showEmojiPicker && emojiPos && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
          <FullEmojiPicker
            onSelect={handleReact}
            onClose={() => setShowEmojiPicker(false)}
            style={{ top: emojiPos.top, left: emojiPos.left }}
          />
        </>
      )}

      {showForward && (
        <MessageForwardModal content={message.content} onClose={() => setShowForward(false)} />
      )}
    </div>
  )
}
