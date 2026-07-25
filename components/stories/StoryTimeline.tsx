'use client'

import { Plus, X, Clock, Music } from 'lucide-react'
import type { TextScene } from '@/lib/types/database.types'
import type { SelectedSong } from './MusicPicker'

interface StoryTimelineProps {
  scenes: TextScene[]
  activeSceneId: string
  onSelectScene: (id: string) => void
  onAddScene: () => void
  onDeleteScene: (id: string) => void
  song: SelectedSong | null
  onRemoveSong: () => void
  onOpenDuration: () => void
}

const PX_PER_SECOND = 18

export function StoryTimeline({
  scenes, activeSceneId, onSelectScene, onAddScene, onDeleteScene,
  song, onRemoveSong, onOpenDuration,
}: StoryTimelineProps) {
  const totalSeconds = scenes.reduce((sum, s) => sum + s.duration, 0)
  const rulerSeconds = Math.max(10, Math.ceil(totalSeconds / 5) * 5)

  return (
    <div className="bg-black/60 backdrop-blur-sm border-t border-white/10 px-3 pt-2 pb-3 space-y-2">
      {/* Ruler */}
      <div className="relative h-4 overflow-x-auto scrollbar-hide">
        <div className="relative h-full" style={{ width: `${rulerSeconds * PX_PER_SECOND}px` }}>
          {Array.from({ length: Math.floor(rulerSeconds / 5) + 1 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-0 text-[9px] text-white/40"
              style={{ left: `${i * 5 * PX_PER_SECOND}px` }}
            >
              {i * 5}s
            </span>
          ))}
        </div>
      </div>

      {/* Text scenes track */}
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-[10px] uppercase tracking-wide w-10 shrink-0">Text</span>
        <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {scenes.map((scene, i) => (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              style={{ width: `${Math.max(scene.duration * PX_PER_SECOND, 44)}px` }}
              className={`relative h-9 shrink-0 rounded-md flex items-center px-2 text-[11px] font-medium text-white truncate transition-colors ${
                scene.id === activeSceneId ? 'bg-pink-500 ring-2 ring-white' : 'bg-white/15 hover:bg-white/25'
              }`}
            >
              <span className="truncate">{scene.text || `Scene ${i + 1}`}</span>
              {scenes.length > 1 && scene.id === activeSceneId && (
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id) }}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </button>
          ))}
          <button
            onClick={onAddScene}
            className="h-9 w-9 shrink-0 rounded-md bg-white/10 border border-dashed border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="Add another scene"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Duration control for the currently selected scene, right at the end of this row */}
        <button
          onClick={onOpenDuration}
          className="h-9 shrink-0 rounded-md bg-white/10 flex items-center gap-1 px-2 text-white hover:bg-white/20 transition-colors"
        >
          <Clock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold">
            {scenes.find((s) => s.id === activeSceneId)?.duration ?? 5}s
          </span>
        </button>
      </div>

      {/* Music track */}
      {song && (
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-[10px] uppercase tracking-wide w-10 shrink-0">Music</span>
          <div className="flex-1 flex items-center gap-2 h-9 rounded-md bg-white/15 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={song.artworkUrl} alt={song.title} className="h-6 w-6 rounded object-cover shrink-0" />
            <span className="text-[11px] text-white truncate flex-1">{song.title} &middot; {song.artist}</span>
            <button onClick={onRemoveSong} className="h-5 w-5 shrink-0 rounded-full bg-white/20 flex items-center justify-center">
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
