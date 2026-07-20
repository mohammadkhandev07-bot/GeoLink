'use client'

import { useRef, useState } from 'react'
import { X, ArrowLeft, Upload, Type, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateStory } from '@/lib/hooks/useStories'

interface MediaStoryModalProps {
  userId: string
  mode: 'photo' | 'video'
  onClose: () => void
  onBack: () => void
}

export function MediaStoryModal({ userId, mode, onClose, onBack }: MediaStoryModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [overlayText, setOverlayText] = useState('')
  const [editingText, setEditingText] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 50 }) // percent from top-left
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const { createMediaStory } = useCreateStory()

  const accept = mode === 'photo' ? 'image/*' : 'video/*'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  // Dragging the overlay text around the media - position is stored as a
  // percentage of the canvas so it lines up the same on any screen size.
  const updatePosFromClientPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    setPos({ x, y })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    updatePosFromClientPoint(e.clientX, e.clientY)
  }
  const handlePointerUp = () => {
    dragging.current = false
  }

  const handleShare = async () => {
    if (!file) return
    try {
      await createMediaStory.mutateAsync({
        userId,
        file,
        storyType: mode,
        overlayText: overlayText.trim() || undefined,
        overlayX: pos.x,
        overlayY: pos.y,
      })
      onClose()
    } catch {
      // surfaced via createMediaStory.isError below
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button onClick={onBack} className="text-white p-1">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <p className="text-white font-semibold">{mode === 'photo' ? 'Photo Story' : 'Video Story'}</p>
        <button onClick={onClose} className="text-white p-1">
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-3 text-white/80 hover:text-white transition-colors"
          >
            <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center">
              <Upload className="h-7 w-7" />
            </div>
            <span className="font-medium">Upload from device</span>
            <span className="text-xs text-white/50">{mode === 'photo' ? 'Photos only' : 'Videos only'}</span>
          </button>
        ) : (
          <div
            ref={canvasRef}
            className="relative w-full h-full flex items-center justify-center touch-none select-none"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {mode === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Story preview" className="max-w-full max-h-full object-contain" />
            ) : (
              <video src={preview} className="max-w-full max-h-full object-contain" autoPlay loop muted playsInline />
            )}

            {overlayText && (
              <div
                onPointerDown={handlePointerDown}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                className="absolute cursor-grab active:cursor-grabbing px-3 py-1.5 max-w-[85%] text-center"
              >
                <p className="text-white text-xl font-bold break-words" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                  {overlayText}
                </p>
              </div>
            )}
          </div>
        )}

        <input ref={fileRef} type="file" accept={accept} onChange={handleFileChange} className="hidden" />
      </div>

      {/* Text input row (shown when adding/editing overlay text) */}
      {editingText && (
        <div className="p-4 border-t border-white/10">
          <input
            autoFocus
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingText(false) }}
            placeholder="Type your caption..."
            maxLength={100}
            className="w-full bg-white/10 text-white placeholder:text-white/50 rounded-xl px-4 py-2.5 outline-none"
          />
          <button
            onClick={() => setEditingText(false)}
            className="text-white/70 text-sm mt-2"
          >
            Done — drag the text on your {mode} to reposition it
          </button>
        </div>
      )}

      {/* Footer actions */}
      {preview && !editingText && (
        <div className="p-4 flex items-center gap-3 border-t border-white/10">
          <button
            onClick={() => setEditingText(true)}
            className="h-11 px-4 shrink-0 rounded-full bg-white/10 flex items-center gap-2 text-white hover:bg-white/20 transition-colors"
          >
            <Type className="h-5 w-5" />
            <span className="text-sm font-medium">{overlayText ? 'Edit text' : 'Add text'}</span>
          </button>
          <Button
            variant="gradient"
            className="flex-1"
            disabled={createMediaStory.isPending}
            onClick={handleShare}
          >
            {createMediaStory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share to Story'}
          </Button>
        </div>
      )}
      {createMediaStory.isError && (
        <p className="text-xs text-red-400 text-center pb-3">Couldn't post your story. Try again.</p>
      )}
    </div>
  )
} 
