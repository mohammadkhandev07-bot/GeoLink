'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check, Play, Pause } from 'lucide-react'
import type { SelectedSong } from './MusicPicker'

interface MusicTrimPanelProps {
  song: SelectedSong
  initialStart: number
  initialDuration: number
  sceneDuration: number
  onCancel: () => void
  onDone: (start: number, duration: number) => void
  onRemove: () => void
}

const CLIP_LENGTH = 30 // iTunes preview Clips are ~30 seconds

export function MusicTrimPanel({ song, initialStart, initialDuration, sceneDuration, onCancel, onDone, onRemove }: MusicTrimPanelProps) {
  const [start, setStart] = useState(Math.min(initialStart, CLIP_LENGTH - 1))
  const [duration, setDuration] = useState(Math.min(initialDuration, sceneDuration, CLIP_LENGTH - start))
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => { audioRef.current?.pause() }
  }, [])

  const togglePreview = () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    const audio = new Audio(song.previewUrl)
    audio.currentTime = start
    audio.play().catch(() => {})
    const stopAt = setTimeout(() => { audio.pause(); setPlaying(false) }, duration * 1000)
    audio.onended = () => { setPlaying(false); clearTimeout(stopAt) }
    audioRef.current = audio
    setPlaying(true)
  }

  const handleStartChange = (v: number) => {
    audioRef.current?.pause()
    setPlaying(false)
    const clampedStart = Math.min(v, CLIP_LENGTH - 1)
    setStart(clampedStart)
    if (clampedStart + duration > CLIP_LENGTH) setDuration(CLIP_LENGTH - clampedStart)
  }

  const handleDurationChange = (v: number) => {
    audioRef.current?.pause()
    setPlaying(false)
    setDuration(Math.min(v, CLIP_LENGTH - start, sceneDuration))
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[110] bg-card border-b shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-bold text-sm truncate">{song.title} &middot; {song.artist}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePreview}
            className="h-10 w-10 shrink-0 rounded-full bg-pink-500 flex items-center justify-center text-white"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">Start at: {start}s</p>
            <input
              type="range"
              min={0}
              max={CLIP_LENGTH - 1}
              value={start}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className="w-full accent-pink-500"
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Length: {duration}s</p>
          <input
            type="range"
            min={1}
            max={Math.min(CLIP_LENGTH - start, sceneDuration)}
            value={duration}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            className="w-full accent-pink-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border font-medium text-sm hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { audioRef.current?.pause(); onDone(start, duration) }}
            className="flex-1 py-2 rounded-xl bg-pink-500 text-white font-medium text-sm hover:bg-pink-600 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Done
          </button>
        </div>
        <button onClick={onRemove} className="w-full text-center text-xs text-red-500 pt-1">
          Remove song from this scene
        </button>
      </div>
    </div>
  )
}
