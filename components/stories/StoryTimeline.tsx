'use client'

import { useRef, useState } from 'react'
import { Plus, Music as MusicIcon, MoreVertical, Type } from 'lucide-react'
import type { TextScene, GlobalMusic } from '@/lib/types/database.types'
import { SceneMenu } from './SceneMenu'

interface StoryTimelineProps {
  scenes: TextScene[]
  activeSceneId: string
  onSelectScene: (id: string) => void
  onAddScene: () => void
  onDeleteScene: (id: string) => void
  onDuplicateScene: (id: string) => void
  onResizeScene: (id: string, duration: number) => void
  onEditText: (id: string) => void
  onChangeTextColor: (id: string) => void
  onChangeBackground: (id: string) => void
  onSeparateSong: (id: string) => void
  globalMusic: GlobalMusic | null
  onOpenGlobalMusic: () => void
}

const PX_PER_SECOND = 20
const MIN_SCENE_DURATION = 1
const MAX_SCENE_DURATION = 60
// Touch drags report much smaller pixel deltas than mouse drags for the
// same physical finger movement on most phones, so the resize handle felt
// almost unresponsive - this multiplier makes a small finger drag move the
// duration a lot more, on touch specifically.
const TOUCH_SENSITIVITY = 4

export function StoryTimeline({
  scenes, activeSceneId, onSelectScene, onAddScene, onDeleteScene, onDuplicateScene,
  onResizeScene, onEditText, onChangeTextColor, onChangeBackground, onSeparateSong,
  globalMusic, onOpenGlobalMusic,
}: StoryTimelineProps) {
  const [menuFor, setMenuFor] = useState<{ id: string; x: number; y: number } | null>(null)
  const resizing = useRef<{ id: string; startX: number; startDuration: number; isTouch: boolean } | null>(null)

  const totalSeconds = scenes.reduce((sum, s) => sum + s.duration, 0)
  const rulerSeconds = Math.max(15, Math.ceil(totalSeconds / 5) * 5 + 5)

  const handleResizeStart = (e: React.PointerEvent, scene: TextScene) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    resizing.current = { id: scene.id, startX: e.clientX, startDuration: scene.duration, isTouch: e.pointerType === 'touch' }
  }
  const handleResizeMove = (e: React.PointerEvent) => {
    if (!resizing.current) return
    const sensitivity = resizing.current.isTouch ? TOUCH_SENSITIVITY : 1
    const deltaSeconds = ((e.clientX - resizing.current.startX) * sensitivity) / PX_PER_SECOND
    const next = Math.round(Math.min(MAX_SCENE_DURATION, Math.max(MIN_SCENE_DURATION, resizing.current.startDuration + deltaSeconds)))
    onResizeScene(resizing.current.id, next)
  }
  const handleResizeEnd = () => { resizing.current = null }

  return (
    <div className="bg-[#111214] border-t border-white/10 px-3 pt-2 pb-3 space-y-1.5">
      {/* Ruler */}
      <div className="relative h-4 overflow-x-auto scrollbar-hide">
        <div className="relative h-full" style={{ width: `${rulerSeconds * PX_PER_SECOND}px` }}>
          {Array.from({ length: Math.floor(rulerSeconds / 5) + 1 }).map((_, i) => (
            <span key={i} className="absolute top-0 text-[9px] text-white/40" style={{ left: `${i * 5 * PX_PER_SECOND}px` }}>
              {i * 5}s
            </span>
          ))}
        </div>
      </div>

      {/* Text scenes track */}
      <div className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5 text-white/40 shrink-0" />
        <div
          className="flex-1 flex items-center gap-[3px] overflow-x-auto scrollbar-hide"
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
        >
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              style={{ width: `${Math.max(scene.duration * PX_PER_SECOND, 50)}px` }}
              className={`relative h-10 shrink-0 rounded-md flex items-center px-2 cursor-pointer transition-colors ${
                scene.id === activeSceneId ? 'bg-pink-500 ring-2 ring-white' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              {scene.musicUrl && <MusicIcon className="h-3 w-3 text-white/80 shrink-0 mr-1" />}
              <span className="text-[11px] font-medium text-white truncate flex-1">{scene.text || `Scene ${i + 1}`}</span>

              {scene.id === activeSceneId && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setMenuFor(menuFor?.id === scene.id ? null : { id: scene.id, x: rect.left, y: rect.top })
                    }}
                    className="h-5 w-5 shrink-0 rounded-full bg-black/30 flex items-center justify-center ml-1"
                  >
                    <MoreVertical className="h-3 w-3 text-white" />
                  </button>
                  {/* Drag handle to resize this scene's duration - a bigger
                      invisible touch target than it looks, so it's easy to
                      Grab on a phone. */}
                  <div
                    onPointerDown={(e) => handleResizeStart(e, scene)}
                    className="absolute -right-2 top-0 h-full w-6 cursor-ew-resize flex items-center justify-center touch-none"
                  >
                    <div className="h-6 w-1.5 rounded-full bg-white" />
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            onClick={onAddScene}
            className="h-10 w-10 shrink-0 rounded-md bg-white/10 border border-dashed border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Add another scene"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Music track - one song shared across the whole story. Scenes with
          their own separate song (little music icon on their block above)
          override this for just their own duration. */}
      <div className="flex items-center gap-2">
        <MusicIcon className="h-3.5 w-3.5 text-white/40 shrink-0" />
        {globalMusic ? (
          <button
            onClick={onOpenGlobalMusic}
            className="flex-1 flex items-center gap-2 h-9 rounded-md bg-white/15 px-2 hover:bg-white/25 transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={globalMusic.artworkUrl} alt={globalMusic.title} className="h-6 w-6 rounded object-cover shrink-0" />
            <span className="text-[11px] text-white truncate flex-1 text-left">
              {globalMusic.title} &middot; {globalMusic.artist}
            </span>
            <span className="text-[10px] text-white/50 shrink-0">Trim</span>
          </button>
        ) : (
          <button
            onClick={onOpenGlobalMusic}
            className="flex-1 h-9 rounded-md bg-white/5 border border-dashed border-white/20 flex items-center justify-center gap-1.5 text-white/60 text-[11px] hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add music for your story
          </button>
        )}
      </div>

      {/* Rendered fixed to the viewport (not inside the horizontally-
          scrolling track above) so it never gets clipped by that track's
          overflow. */}
      {menuFor && (
        <SceneMenu
          anchorX={menuFor.x}
          anchorY={menuFor.y}
          canDelete={scenes.length > 1}
          hasSeparateSong={!!scenes.find((s) => s.id === menuFor.id)?.musicUrl}
          onClose={() => setMenuFor(null)}
          onDelete={() => onDeleteScene(menuFor.id)}
          onDuplicate={() => onDuplicateScene(menuFor.id)}
          onEditText={() => onEditText(menuFor.id)}
          onChangeTextColor={() => onChangeTextColor(menuFor.id)}
          onChangeBackground={() => onChangeBackground(menuFor.id)}
          onSeparateSong={() => onSeparateSong(menuFor.id)}
        />
      )}
    </div>
  )
}
