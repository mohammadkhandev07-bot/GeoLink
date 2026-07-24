'use client'

import { useRef, useState } from 'react'
import { X, ArrowLeft, Smile, Loader2, Palette, Music, Play, Pause, Clock, Circle, CaseSensitive, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmojiPicker } from './EmojiPicker'
import { MusicPicker, SelectedSong } from './MusicPicker'
import { DiscardConfirmDialog } from './DiscardConfirmDialog'
import { FontPicker } from './FontPicker'
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

// Builds the CSS to actually render a story's text color, whether it's a
// plain solid color or a "gradient:#hex1:#hex2" gradient-fill value.
function getTextColorStyle(textColor: string): React.CSSProperties {
  if (textColor.startsWith('gradient:')) {
    const [, c1, c2] = textColor.split(':')
    return {
      backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
    }
  }
  return { color: textColor }
}

export function TextStoryModal({ userId, onClose, onBack }: TextStoryModalProps) {
  const [text, setText] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0].css)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [customColor1, setCustomColor1] = useState('#ec4899')
  const [customColor2, setCustomColor2] = useState('#06b6d4')
  const [showSolidPicker, setShowSolidPicker] = useState(false)
  const [solidColor, setSolidColor] = useState('#ec4899')

  // Text color/style
  const [textColor, setTextColor] = useState('#ffffff')
  const [showTextSolidPicker, setShowTextSolidPicker] = useState(false)
  const [textSolidColor, setTextSolidColor] = useState('#ffffff')
  const [showTextGradientPicker, setShowTextGradientPicker] = useState(false)
  const [textGradient1, setTextGradient1] = useState('#ec4899')
  const [textGradient2, setTextGradient2] = useState('#06b6d4')
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [fontFamily, setFontFamily] = useState('')

  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [song, setSong] = useState<SelectedSong | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [showDuration, setShowDuration] = useState(false)
  const [duration, setDuration] = useState(5)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [discardAction, setDiscardAction] = useState<'close' | 'back' | null>(null)
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

  const applySolidColor = () => {
    // A plain, single flat color - no gradient - for people who want a
    // simple, clean background instead of the shaded/gradient presets.
    setBackground(solidColor)
    setShowSolidPicker(false)
  }

  const applyTextSolidColor = () => {
    setTextColor(textSolidColor)
    setShowTextSolidPicker(false)
  }

  const applyTextGradient = () => {
    setTextColor(`gradient:${textGradient1}:${textGradient2}`)
    setShowTextGradientPicker(false)
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

  const removeSong = () => {
    previewAudioRef.current?.pause()
    setPreviewPlaying(false)
    setSong(null)
  }

  // Anything typed or picked counts as unsaved work worth protecting.
  const hasUnsavedWork = text.trim().length > 0 || !!song

  const requestClose = () => {
    if (hasUnsavedWork) {
      setDiscardAction('close')
      setShowDiscardConfirm(true)
    } else {
      onClose()
    }
  }

  const requestBack = () => {
    if (hasUnsavedWork) {
      setDiscardAction('back')
      setShowDiscardConfirm(true)
    } else {
      onBack()
    }
  }

  const confirmDiscard = () => {
    previewAudioRef.current?.pause()
    setShowDiscardConfirm(false)
    if (discardAction === 'back') onBack()
    else onClose()
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
        durationSeconds: duration,
        textColor,
        fontFamily: fontFamily || undefined,
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
        <button onClick={requestBack} className="text-white p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <p className="text-white font-semibold">Text Story</p>
        <button onClick={requestClose} className="text-white p-1">
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
          style={{ ...getTextColorStyle(textColor), fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }}
          className="w-full max-h-full bg-transparent text-center text-2xl font-semibold placeholder:text-white/60 outline-none resize-none"
          rows={6}
        />

        {song && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pl-1.5 pr-1.5 py-1.5 max-w-[85%]">
            <button onClick={toggleSongPreview} className="flex items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={song.artworkUrl} alt={song.title} className="h-7 w-7 rounded-full object-cover shrink-0" />
              <span className="text-white text-xs font-medium truncate">{song.title} &middot; {song.artist}</span>
              {previewPlaying ? <Pause className="h-3.5 w-3.5 text-white shrink-0" /> : <Play className="h-3.5 w-3.5 text-white shrink-0" />}
            </button>
            <button
              onClick={removeSong}
              className="h-5 w-5 shrink-0 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              aria-label="Remove song"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Background color swatches */}
      <div className="flex items-center justify-center gap-2 py-2 relative z-10">
        <span className="text-white/50 text-[10px] uppercase tracking-wide mr-1">Background</span>
        {BACKGROUNDS.map((bg) => (
          <button
            key={bg.key}
            onClick={() => setBackground(bg.css)}
            style={{ background: bg.css }}
            className={`h-7 w-7 rounded-full ${background === bg.css ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
          />
        ))}
        <button
          onClick={() => setShowColorPicker((s) => !s)}
          className="h-7 w-7 rounded-full flex items-center justify-center border-2 border-dashed border-white/50 text-white"
          title="Pick a custom gradient"
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setShowSolidPicker((s) => !s)}
          className="h-7 w-7 rounded-full flex items-center justify-center border-2 border-dashed border-white/50 text-white"
          title="Pick a simple solid color"
        >
          <Circle className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Text color swatches */}
      <div className="flex items-center justify-center gap-2 py-2 relative z-10">
        <span className="text-white/50 text-[10px] uppercase tracking-wide mr-1">Text</span>
        {['#ffffff', '#000000', '#facc15', '#f472b6'].map((c) => (
          <button
            key={c}
            onClick={() => setTextColor(c)}
            style={{ background: c }}
            className={`h-7 w-7 rounded-full border border-white/20 ${textColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
          />
        ))}
        <button
          onClick={() => setShowTextGradientPicker((s) => !s)}
          className="h-7 w-7 rounded-full flex items-center justify-center border-2 border-dashed border-white/50 text-white"
          title="Custom text gradient"
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setShowTextSolidPicker((s) => !s)}
          className="h-7 w-7 rounded-full flex items-center justify-center border-2 border-dashed border-white/50 text-white"
          title="Custom text color"
        >
          <CaseSensitive className="h-4 w-4" />
        </button>
      </div>

      {showSolidPicker && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={solidColor}
                onChange={(e) => setSolidColor(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Background Color</span>
            </div>
            <div className="flex-1 h-9 rounded-lg" style={{ background: solidColor }} />
          </div>
          <Button size="sm" variant="gradient" onClick={applySolidColor}>Apply</Button>
        </div>
      )}

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

      {showTextSolidPicker && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={textSolidColor}
                onChange={(e) => setTextSolidColor(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Text Color</span>
            </div>
            <p className="flex-1 text-lg font-semibold" style={{ color: textSolidColor }}>Aa Preview</p>
          </div>
          <Button size="sm" variant="gradient" onClick={applyTextSolidColor}>Apply</Button>
        </div>
      )}

      {showTextGradientPicker && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={textGradient1}
                onChange={(e) => setTextGradient1(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Color 1</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <input
                type="color"
                value={textGradient2}
                onChange={(e) => setTextGradient2(e.target.value)}
                className="h-9 w-9 rounded-lg cursor-pointer bg-transparent"
              />
              <span className="text-[10px] text-white/70">Color 2</span>
            </div>
            <p className="flex-1 text-lg font-semibold" style={getTextColorStyle(`gradient:${textGradient1}:${textGradient2}`)}>
              Aa Preview
            </p>
          </div>
          <Button size="sm" variant="gradient" onClick={applyTextGradient}>Apply</Button>
        </div>
      )}

      {showDuration && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">Story duration</span>
            <span className="text-white font-bold text-lg">{duration}s</span>
          </div>
          <input
            type="range"
            min={2}
            max={120}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>
      )}

      {/* Footer: emoji + music + font + duration + share */}
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
        <button
          onClick={() => setShowFontPicker(true)}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Choose font"
        >
          <Type className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowDuration((s) => !s)}
          className="h-11 shrink-0 rounded-full bg-white/10 flex items-center gap-1.5 px-3 text-white hover:bg-white/20 transition-colors"
        >
          <Clock className="h-5 w-5" />
          <span className="text-xs font-semibold">{duration}s</span>
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

      {showFontPicker && (
        <FontPicker
          currentFont={fontFamily}
          onSelect={(f) => { setFontFamily(f); setShowFontPicker(false) }}
          onClose={() => setShowFontPicker(false)}
        />
      )}

      {showDiscardConfirm && (
        <DiscardConfirmDialog
          onContinueEditing={() => setShowDiscardConfirm(false)}
          onDiscard={confirmDiscard}
        />
      )}
    </div>
  )
}
