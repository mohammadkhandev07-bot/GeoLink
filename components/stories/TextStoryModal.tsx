'use client'

import { useRef, useState } from 'react'
import { X, ArrowLeft, Smile, Loader2, Music, Type, Play, Minus, Plus, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmojiPicker } from './EmojiPicker'
import { MusicPicker, SelectedSong } from './MusicPicker'
import { MusicTrimPanel } from './MusicTrimPanel'
import { DiscardConfirmDialog } from './DiscardConfirmDialog'
import { FontPicker } from './FontPicker'
import { ColorPickerPanel } from './ColorPickerPanel'
import { StoryTimeline } from './StoryTimeline'
import { StoryViewer } from './StoryViewer'
import { useCreateStory } from '@/lib/hooks/useStories'
import { useUser } from '@/lib/hooks/useUser'
import { resolveBackgroundCss, getTextFillStyle } from '@/lib/utils/storyStyle'
import type { TextScene } from '@/lib/types/database.types'
import type { StoryGroup } from '@/lib/hooks/useStories'

interface TextStoryModalProps {
  userId: string
  onClose: () => void
  onBack: () => void
}

function makeSceneId() {
  return Math.random().toString(36).slice(2, 9)
}

function newScene(): TextScene {
  return {
    id: makeSceneId(),
    text: '',
    duration: 5,
    backgroundColor: 'gradient:#ec4899:#06b6d4',
    textColor: '#ffffff',
    fontFamily: undefined,
    textX: 50,
    textY: 50,
    textSize: 28,
  }
}

export function TextStoryModal({ userId, onClose, onBack }: TextStoryModalProps) {
  const { profile } = useUser()
  const [scenes, setScenes] = useState<TextScene[]>([newScene()])
  const [activeSceneId, setActiveSceneId] = useState(scenes[0].id)

  const [colorPanel, setColorPanel] = useState<'bg' | 'text' | null>(null)
  const colorBeforePicker = useRef('')

  const [showEmoji, setShowEmoji] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const fontBeforePicker = useRef('')

  const [showMusicPicker, setShowMusicPicker] = useState(false)
  const [trimSong, setTrimSong] = useState<SelectedSong | null>(null)

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [discardAction, setDiscardAction] = useState<'close' | 'back' | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const { createTextStory } = useCreateStory()

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0]

  const updateScene = (id: string, patch: Partial<TextScene>) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    const current = activeScene.text
    if (!el) { updateScene(activeSceneId, { text: current + emoji }); return }
    const start = el.selectionStart ?? current.length
    const end = el.selectionEnd ?? current.length
    const next = current.slice(0, start) + emoji + current.slice(end)
    updateScene(activeSceneId, { text: next })
    requestAnimationFrame(() => { el.focus(); const pos = start + emoji.length; el.setSelectionRange(pos, pos) })
  }

  const handleAddScene = () => {
    const s = newScene()
    setScenes((prev) => [...prev, s])
    setActiveSceneId(s.id)
  }

  const handleDuplicateScene = (id: string) => {
    const source = scenes.find((s) => s.id === id)
    if (!source) return
    const copy = { ...source, id: makeSceneId() }
    setScenes((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setActiveSceneId(copy.id)
  }

  const handleDeleteScene = (id: string) => {
    setScenes((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (next.length === 0) return prev
      if (id === activeSceneId) setActiveSceneId(next[0].id)
      return next
    })
  }

  // Dragging the text box around the canvas.
  const updatePosFromClientPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.min(95, Math.max(5, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(95, Math.max(5, ((clientY - rect.top) / rect.height) * 100))
    updateScene(activeSceneId, { textX: x, textY: y })
  }
  const handleDragStart = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const handleDragMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    updatePosFromClientPoint(e.clientX, e.clientY)
  }
  const handleDragEnd = () => { dragging.current = false }

  const adjustTextSize = (delta: number) => {
    updateScene(activeSceneId, { textSize: Math.min(64, Math.max(14, activeScene.textSize + delta)) })
  }

  const hasUnsavedWork = scenes.some((s) => s.text.trim().length > 0 || !!s.musicUrl)
  const requestClose = () => { if (hasUnsavedWork) { setDiscardAction('close'); setShowDiscardConfirm(true) } else onClose() }
  const requestBack = () => { if (hasUnsavedWork) { setDiscardAction('back'); setShowDiscardConfirm(true) } else onBack() }
  const confirmDiscard = () => {
    previewAudioRef.current?.pause()
    setShowDiscardConfirm(false)
    if (discardAction === 'back') onBack(); else onClose()
  }

  const handleShare = async () => {
    if (!scenes.some((s) => s.text.trim())) return
    try {
      await createTextStory.mutateAsync({
        userId,
        scenes: scenes.filter((s) => s.text.trim()).map((s) => ({ ...s, text: s.text.trim() })),
      })
      onClose()
    } catch {
      // surfaced via createTextStory.isError below
    }
  }

  // Builds a throwaway "story" out of the current draft so it can be played
  // through the exact same viewer people see after posting - lets them
  // check the whole thing (colors, timing, music) before sharing it for real.
  const buildDraftGroup = (): StoryGroup | null => {
    if (!profile) return null
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0) || 5
    const first = scenes[0]
    const draftStory: any = {
      id: 'draft-preview',
      user_id: userId,
      story_type: 'text',
      media_url: null,
      text_content: first?.text || '',
      background_color: first?.backgroundColor || null,
      overlay_text: null, overlay_x: 50, overlay_y: 50,
      music_url: first?.musicUrl || null,
      music_title: first?.musicTitle || null,
      music_artist: first?.musicArtist || null,
      music_artwork_url: first?.musicArtworkUrl || null,
      duration_seconds: totalDuration,
      text_color: first?.textColor || null,
      font_family: first?.fontFamily || null,
      overlay_text_color: null,
      overlay_font_family: null,
      text_scenes: scenes,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      profiles: profile,
    }
    return { userId, profile, stories: [draftStory] }
  }
  const draftGroup = showPreview ? buildDraftGroup() : null

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

      {/* Top: 2 simple options, apply to the currently selected scene */}
      <div className="flex items-center gap-2 px-4 pb-3 relative z-10">
        <button
          onClick={() => { colorBeforePicker.current = activeScene.backgroundColor; setColorPanel('bg') }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <span className="h-4 w-4 rounded-full" style={{ background: resolveBackgroundCss(activeScene.backgroundColor) }} />
          Background Color
        </button>
        <button
          onClick={() => { colorBeforePicker.current = activeScene.textColor; setColorPanel('text') }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          <span className="h-4 w-4 rounded-full border border-white/40" style={{ background: activeScene.textColor.startsWith('gradient:') ? resolveBackgroundCss(activeScene.textColor) : activeScene.textColor }} />
          Text Color
        </button>
      </div>

      {colorPanel === 'bg' && (
        <ColorPickerPanel
          label="Background Color"
          initialValue={activeScene.backgroundColor}
          onPreview={(v) => updateScene(activeSceneId, { backgroundColor: v })}
          onCancel={() => { updateScene(activeSceneId, { backgroundColor: colorBeforePicker.current }); setColorPanel(null) }}
          onDone={() => setColorPanel(null)}
        />
      )}
      {colorPanel === 'text' && (
        <ColorPickerPanel
          label="Text Color"
          initialValue={activeScene.textColor}
          onPreview={(v) => updateScene(activeSceneId, { textColor: v })}
          onCancel={() => { updateScene(activeSceneId, { textColor: colorBeforePicker.current }); setColorPanel(null) }}
          onDone={() => setColorPanel(null)}
        />
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden touch-none"
        style={{ background: resolveBackgroundCss(activeScene.backgroundColor) }}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
      >
        <div
          style={{ left: `${activeScene.textX}%`, top: `${activeScene.textY}%`, transform: 'translate(-50%, -50%)' }}
          className="absolute max-w-[85%] select-none"
        >
          <textarea
            ref={textareaRef}
            value={activeScene.text}
            onChange={(e) => updateScene(activeSceneId, { text: e.target.value })}
            placeholder="Start typing..."
            autoFocus
            maxLength={280}
            rows={3}
            style={{
              ...getTextFillStyle(activeScene.textColor),
              fontFamily: activeScene.fontFamily ? `'${activeScene.fontFamily}', sans-serif` : undefined,
              fontSize: `${activeScene.textSize}px`,
            }}
            className="bg-transparent text-center font-semibold outline-none resize-none w-full"
          />
          {/* Drag handle + size controls */}
          <div className="flex items-center justify-center gap-2 mt-1">
            <button onPointerDown={handleDragStart} className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center cursor-grab active:cursor-grabbing">
              <Move className="h-3.5 w-3.5 text-white" />
            </button>
            <button onClick={() => adjustTextSize(-4)} className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
              <Minus className="h-3.5 w-3.5 text-white" />
            </button>
            <button onClick={() => adjustTextSize(4)} className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline strip */}
      <StoryTimeline
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSelectScene={setActiveSceneId}
        onAddScene={handleAddScene}
        onDeleteScene={handleDeleteScene}
        onDuplicateScene={handleDuplicateScene}
        onResizeScene={(id, duration) => updateScene(id, { duration })}
        onEditText={() => textareaRef.current?.focus()}
        onChangeTextColor={() => { colorBeforePicker.current = activeScene.textColor; setColorPanel('text') }}
        onChangeBackground={() => { colorBeforePicker.current = activeScene.backgroundColor; setColorPanel('bg') }}
        onOpenMusic={() => {
          if (activeScene.musicUrl && activeScene.musicTitle) {
            setTrimSong({
              title: activeScene.musicTitle,
              artist: activeScene.musicArtist || '',
              artworkUrl: activeScene.musicArtworkUrl || '',
              previewUrl: activeScene.musicUrl,
            })
          } else {
            setShowMusicPicker(true)
          }
        }}
      />

      {/* Footer: emoji + font + preview + share */}
      <div className="relative p-4 flex items-center gap-2 border-t border-white/10">
        {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
        <button onClick={() => setShowEmoji((s) => !s)} className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <Smile className="h-5 w-5" />
        </button>
        <button
          onClick={() => { fontBeforePicker.current = activeScene.fontFamily || ''; setShowFontPicker(true) }}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          title="Choose font"
        >
          <Type className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowPreview(true)}
          disabled={!scenes.some((s) => s.text.trim())}
          className="h-11 w-11 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors disabled:opacity-40"
          title="Preview story"
        >
          <Play className="h-5 w-5" />
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
          onSelect={(s) => {
            updateScene(activeSceneId, {
              musicUrl: s.previewUrl, musicTitle: s.title, musicArtist: s.artist, musicArtworkUrl: s.artworkUrl,
              musicStart: 0, musicDuration: Math.min(activeScene.duration, 30),
            })
            setShowMusicPicker(false)
            setTrimSong(s)
          }}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      {trimSong && (
        <MusicTrimPanel
          song={trimSong}
          initialStart={activeScene.musicStart ?? 0}
          initialDuration={activeScene.musicDuration ?? Math.min(activeScene.duration, 30)}
          sceneDuration={activeScene.duration}
          onCancel={() => setTrimSong(null)}
          onDone={(start, duration) => {
            updateScene(activeSceneId, { musicStart: start, musicDuration: duration })
            setTrimSong(null)
          }}
          onRemove={() => {
            updateScene(activeSceneId, {
              musicUrl: undefined, musicTitle: undefined, musicArtist: undefined,
              musicArtworkUrl: undefined, musicStart: undefined, musicDuration: undefined,
            })
            setTrimSong(null)
          }}
        />
      )}

      {showFontPicker && (
        <FontPicker
          currentFont={activeScene.fontFamily || ''}
          onSelect={(f) => updateScene(activeSceneId, { fontFamily: f || undefined })}
          onCancel={() => { updateScene(activeSceneId, { fontFamily: fontBeforePicker.current || undefined }); setShowFontPicker(false) }}
          onDone={() => setShowFontPicker(false)}
        />
      )}

      {showDiscardConfirm && (
        <DiscardConfirmDialog
          onContinueEditing={() => setShowDiscardConfirm(false)}
          onDiscard={confirmDiscard}
        />
      )}

      {showPreview && draftGroup && (
        <StoryViewer
          groups={[draftGroup]}
          startGroupIndex={0}
          currentUserId={undefined}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}
