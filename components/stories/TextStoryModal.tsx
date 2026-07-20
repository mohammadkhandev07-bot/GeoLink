'use client'

import { useRef, useState } from 'react'
import { X, ArrowLeft, Smile, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmojiPicker } from './EmojiPicker'
import { useCreateStory } from '@/lib/hooks/useStories'

interface TextStoryModalProps {
  userId: string
  onClose: () => void
  onBack: () => void
}

// Gradient backgrounds the person can pick between for their text story.
const BACKGROUNDS = [
  { key: 'pink-purple', className: 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500' },
  { key: 'orange-red', className: 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600' },
  { key: 'blue-cyan', className: 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400' },
  { key: 'green-lime', className: 'bg-gradient-to-br from-emerald-500 via-green-500 to-lime-400' },
  { key: 'dark-slate', className: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900' },
  { key: 'violet-fuchsia', className: 'bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500' },
]

export function TextStoryModal({ userId, onClose, onBack }: TextStoryModalProps) {
  const [text, setText] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0].key)
  const [showEmoji, setShowEmoji] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { createTextStory } = useCreateStory()

  const activeBg = BACKGROUNDS.find((b) => b.key === background) ?? BACKGROUNDS[0]

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setText((t) => t + emoji)
      return
    }
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleShare = async () => {
    if (!text.trim()) return
    try {
      await createTextStory.mutateAsync({ userId, text: text.trim(), backgroundColor: activeBg.key })
      onClose()
    } catch {
      // mutation error surfaced below via createTextStory.isError
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button onClick={onBack} className="text-white p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <p className="text-white font-semibold">Text Story</p>
        <button onClick={onClose} className="text-white p-1">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Preview / editor canvas */}
      <div className={`flex-1 flex items-center justify-center p-8 ${activeBg.className}`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Start typing..."
          autoFocus
          maxLength={280}
          className="w-full max-h-full bg-transparent text-white text-center text-2xl font-semibold placeholder:text-white/60 outline-none resize-none"
          rows={6}
        />
      </div>

      {/* Background color swatches */}
      <div className="flex items-center justify-center gap-2 py-3 relative z-10">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.key}
            onClick={() => setBackground(bg.key)}
            className={`h-8 w-8 rounded-full ${bg.className} ${background === bg.key ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
          />
        ))}
      </div>

      {/* Footer: emoji + share */}
      <div className="relative p-4 flex items-center gap-3 border-t border-white/10">
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
        <button
          onClick={() => setShowEmoji((s) => !s)}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <Smile className="h-5 w-5" />
        </button>
        <Button
          variant="gradient"
          className="flex-1"
          disabled={!text.trim() || createTextStory.isPending}
          onClick={handleShare}
        >
          {createTextStory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share to Story'}
        </Button>
      </div>
      {createTextStory.isError && (
        <p className="text-xs text-red-400 text-center pb-3">Couldn't post your story. Try again.</p>
      )}
    </div>
  )
} 
