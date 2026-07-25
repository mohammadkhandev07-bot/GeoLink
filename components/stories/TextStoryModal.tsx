'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ArrowLeft, Smile, Loader2, Music, Play, Pause, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmojiPicker } from './EmojiPicker'
import { MusicPicker, SelectedSong } from './MusicPicker'
import { DiscardConfirmDialog } from './DiscardConfirmDialog'
import { FontPicker } from './FontPicker'
import { ColorPickerPanel } from './ColorPickerPanel'
import { StoryTimeline } from './StoryTimeline'
import { useCreateStory } from '@/lib/hooks/useStories'
import { resolveBackgroundCss, getTextFillStyle } from '@/lib/utils/storyStyle'
import type { TextScene } from '@/lib/types/database.types'

interface TextStoryModalProps {
  userId: string
  onClose: () => void
  onBack: () => void
}

function makeSceneId() {
  return Math.random().toString(36).slice(2, 9)
}

export function TextStoryModal({ userId, onClose, onBack }: TextStoryModalProps) {
  const [scenes, setScenes] = useState<TextScene[]>([{ id: makeSceneId(), text: '', duration: 5 }])
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id)

  const [background, setBackground] = useState('gradient:#ec4899:#06b6d4')
  const [textColor, setTextColor] = useState('#ffffff')
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [showTextPicker, setShowTextPicker] = useState(false)
  const bgBeforePicker = useRef('')
  const textColorBeforePicker = useRef('')

  const [showEmoji, setShowEmoji] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [fontFamily, setFontFamily] = useState('')
  const fontBeforePicker = useRef('')

  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [song, setSong] = useState<SelectedSong | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [showDuration, setShowDuration] = useState(false)

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [discardAction, setDiscardAction] = useState<'close' | 'back' | null>(null)

  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { createTextStory } = useCreateStory()

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0]

  const updateActiveSceneText = (text: string) => {
    setScenes((prev) => prev.map((s) => (s.id === activeSceneId ? { ...s, text } : s)))
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    const current = activeScene.text
    if (!el) {
      updateActiveSceneText(current + emoji)
      return
    }
    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    const next = current.slice(0, start) + emoji + current.slice(end)
    updateActiveSceneText(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleAddScene = () => {
    const newScene = { id: makeSceneId(), text: '', duration: 5 }
    setScenes((prev) => [...prev, newScene])
    setActiveSceneId(newScene.id)
  }

  const handleDeleteScene = (id: string) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (next.length === 0) return prev // never go below 1 scene
      if (id === activeSceneId) setActiveSceneId(next[0].id)
      return next
    })
  }

  const updateActiveSceneDuration = (duration: number) => {
    setScenes((prev) => prev.map((s) => (s.id === activeSceneId ? { ...s, duration } : s)))
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

  const hasUnsavedWork = scenes.some((s) => s.text.trim().length > 0) || !!song

  const requestClose = () => {
    if (hasUnsavedWork) { setDiscardAction('close'); setShowDiscardConfirm(true) } else onClose()
  }
  const requestBack = () => {
    if (hasUnsavedWork) { setDiscardAction('back'); setShowDiscardConfirm(true) } else onBack()
  }
  const confirmDiscard = () => {
    previewAudioRef.current?.pause()
    setShowDiscardConfirm(false)
    if (discardAction === 'back') onBack(); else onClose()
  }

  const handleShare = async () => {
    if (!scenes.some((s) => s.text.trim())) return
    previewAudioRef.current?.pause()
    try {
      await createTextStory.mutateAsync({
        userId,
        scenes: scenes.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() })),
        backgroundColor: background,
        musicUrl: song?.previewUrl,
        musicTitle: song?.title,
        musicArtist: song?.artist,
        musicArtworkUrl: song?.artworkUrl,
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

      {/* Top: just 2 simple options - Background / Text color */}
      <div className="flex items-center gap-2 px-4 pb-3 relative z-10">
        <button
          onClick={() => { bgBeforePicker.current = background; setShowBgPicker(true) }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <span className="h-4 w-4 rounded-full" style={{ background: resolveBackgroundCss(background) }} />
          Background Color
        </button>
        <button
          onClick={() => { textColorBeforePicker.current = textColor; setShowTextPicker(true) }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <span className="h-4 w-4 rounded-full border border-white/40" style={{ background: textColor.startsWith('gradient:') ? resolveBackgroundCss(textColor) : textColor }} />
          Text Color
        </button>
      </div>

      {showBgPicker && (
        <ColorPickerPanel
          label="Background Color"
          initialValue={background}
          onPreview={(v) => setBackground(v)}
          onCancel={() => { setBackground(bgBeforePicker.current); setShowBgPicker(false) }}
          onDone={() => setShowBgPicker(false)}
        />
      )}
      {showTextPicker && (
        <ColorPickerPanel
          label="Text Color"
          initialValue={textColor}
          onPreview={(v) => setTextColor(v)}
          onCancel={() => { setTextColor(textColorBeforePicker.current); setShowTextPicker(false) }}
          onDone={() => setShowTextPicker(false)}
        />
      )}

      {/* Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative" style={{ background: resolveBackgroundCss(background) }}>
        <textarea
          ref={textareaRef}
          value={activeScene.text}
          onChange={(e) => updateActiveSceneText(e.target.value)}
          placeholder="Start typing..."
          autoFocus
          maxLength={280}
          style={{ ...getTextFillStyle(textColor), fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined }}
          className="w-full max-h-full bg-transparent text-center text-2xl font-semibold placeholder:text-white/60 outline-none resize-none"
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

      {/* Timeline strip - like a video editor: scenes track + music track + duration */}
      <StoryTimeline
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
        onAddScene={handleAddScene}
        onDeleteScene={handleDeleteScene}
        song={song}
        onRemoveSong={removeSong}
        onOpenDuration={() => setShowDuration((s) => !s)}
      />

      {showDuration && (
        <div className="relative z-20 mx-4 mb-3 bg-white/10 backdrop-blur-md rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">This scene's duration</span>
            <span className="text-white font-bold text-lg">{activeScene.duration}s</span>
          </div>
          <input
            type="range"
            min={2}
            max={120}
            value={activeScene.duration}
            onChange={(e) => updateActiveSceneDuration(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>
      )}

      {/* Footer: emoji + music + font + share */}
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
          onClick={() => { fontBeforePicker.current = fontFamily; setShowFontPicker(true) }}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Choose font"
        >
          <Type className="h-5 w-5" />
        </button>
        <Button
          variant="gradient"
          className="flex-1"
          disabled={!scenes.some((s) => s.text.trim()) || createTextStory.isPending}
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
          onSelect={(f) => setFontFamily(f)}
          onCancel={() => { setFontFamily(fontBeforePicker.current); setShowFontPicker(false) }}
          onDone={() => setShowFontPicker(false)}
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
