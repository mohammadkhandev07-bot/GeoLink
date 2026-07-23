'use client'

import { useRef, useState } from 'react'
import { X, ArrowLeft, Smile, Loader2, Palette, Music, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmojiPicker } from './EmojiPicker'
import { MusicPicker, SelectedSong } from './MusicPicker'
import { useCreateStory } from '@/lib/hooks/useStories'

interface TextStoryModalProps {
  userId: string
  onClose: () => void
  onBack: () => void
}

// Gradient backgrounds the person can pick between for their text story.
// Stored as raw CSS so the exact same value can be replayed later in the
// viewer without depending on Tailwind's generated classes.
const BACKGROUNDS = [
  { key: 'pink-purple', css: 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)' },
  { key: 'orange-red', css: 'linear-gradient(135deg, #fb923c, #ef4444, #db2777)' },
  { key: 'blue-cyan', css: 'linear-gradient(135deg, #2563eb, #06b6d4, #2dd4bf)' },
  { key: 'green-lime', css: 'linear-gradient(135deg, #10b981, #22c55e, #a3e635)' },
  { key: 'dark-slate', css: 'linear-gradient(135deg, #1e293b, #334155, #0f172a)' },
  { key: 'violet-fuchsia', css: 'linear-gradient(135deg, #7c3aed, #d946ef, #ec4899)' },
]

export function TextStoryModal({ userId, onClose, onBack }: TextStoryModalProps) {
  const [text, setText] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0].css)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColor1, setCustomColor1] = useState('#ec4899')
  const [customColor2, setCustomColor2] = useState('#06b6d4')
  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [song, setSong] = useState<SelectedSong | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { createTextStory } = useCreateStory()

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

  const applyCustomColor = () => {
    // Any color in the world, picked from the browser's native full-spectrum
    // color wheel - not limited to the 6 presets.
    setBackground(`linear-gradient(135deg, ${customColor1}, ${customColor2})`)
    setShowColorPicker(false)
  }

  const toggleSongPreview = () => {
    if (!song) return
    if (previewPlaying) {
      previewAudioRef.current?.pause()
      setPreviewPlaying(false)
      return
    }
    const audio = new Audio(song.previewUrl)
    audio.play().catch(() => {})
    audio.onended = () => setPreviewPlaying(false)
    previewAudioRef.current = audio
    setPreviewPlaying(true)
  }

  const handleShare = async () => {
    if (!text.trim()) return
    previewAudioRef.current?.pause()
    try {
      await createTextStory.mutateAsync({
        userId,
        text: text.trim(),
        backgroundColor: background,
        musicUrl: song?.previewUrl,
        musicTitle: song?.title,
        musicArtist: song?.artist,
        musicArtworkUrl: song?.artworkUrl,
      })
      onClose()
    } catch {
      // surfaced via createTextStory.isError below
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative" style={{ background }}>
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

        {song && (
          <button
            onClick={toggleSongPreview}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pl-1.5 pr-4 py-1.5 max-w-[85%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={song.artworkUrl} alt={song.title} className="h-7 w-7 rounded-full object-cover shrink-0" />
            <span className="text-white text-xs font-medium truncate">{song.title} &middot; {song.artist}</span>
            {previewPlaying ? <Pause className="h-3.5 w-3.5 text-white shrink-0" /> : <Play className="h-3.5 w-3.5 text-white shrink-0" />}
          </button>
        )}
      </div>

      {/* Background color swatches */}
      <div className="flex items-center justify-center gap-2 py-3 relative z-10">
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.key}
            onClick={() => setBackground(bg.css)}
            style={{ background: bg.css }}
            className={`h-8 w-8 rounded-full ${background === bg.css ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
          />
        ))}
        {/* Custom color - pick any color that exists */}
        <button
          onClick={() => setShowColorPicker((s) => !s)}
          className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-dashed border-white/50 text-white"
          title="Pick any color"
        >
          <Palette className="h-4 w-4" />
        </button>
      </div>

      {showColorPicker && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={customColor1}
                onChange={(e) => setCustomColor1(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Color 1</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={customColor2}
                onChange={(e) => setCustomColor2(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Color 2</span>
            </div>
            <div
              className="flex-1 h-9 rounded-lg"
              style={{ background: `linear-gradient(135deg, ${customColor1}, ${customColor2})` }}
            />
          </div>
          <Button size="sm" variant="gradient" onClick={applyCustomColor}>Apply</Button>
        </div>
      )}

      {/* Footer: emoji + music + share */}
      <div className="relative p-4 flex items-center gap-2 border-t border-white/10">
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
        <button
          onClick={() => setShowEmoji((s) => !s)}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowMusicPicker(true)}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <Music className="h-5 w-5" />
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

      {showMusicPicker && (
        <MusicPicker
          onSelect={(s) => { setSong(s); setShowMusicPicker(false) }}
          onClose={() => setShowMusicPicker(false)}
        />
      )}
    </div>
  )
}
