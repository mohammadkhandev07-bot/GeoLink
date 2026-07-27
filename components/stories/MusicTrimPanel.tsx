'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Check } from 'lucide-react'
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

const CLIP_LENGTH = 30 // iTunes preview clips are ~30 seconds
// Purely decorative bar heights to look like a waveform (we don't have real
// amplitude data from the preview clip, this just needs to look right).
const BAR_HEIGHTS = Array.from({ length: 46 }, (_, i) => 30 + Math.abs(Math.sin(i * 0.7)) * 60 + (i % 3) * 5)

export function MusicTrimPanel({ song, initialStart, initialDuration, sceneDuration, onCancel, onDone, onRemove }: MusicTrimPanelProps) {
  const [start, setStart] = useState(Math.min(initialStart, CLIP_LENGTH - 2))
  const [duration, setDuration] = useState(Math.min(initialDuration, sceneDuration, CLIP_LENGTH - start))
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ mode: 'left' | 'right' | 'move'; startX: number; origStart: number; origDuration: number } | null>(null)

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const stopAudio = () => { audioRef.current?.pause(); setPlaying(false) }

  const togglePreview = () => {
    if (playing) { stopAudio(); return }
    const audio = new Audio(song.previewUrl)
    audio.currentTime = start
    audio.play().catch(() => {})
    const stopAt = setTimeout(() => { audio.pause(); setPlaying(false) }, duration * 1000)
    audio.onended = () => { setPlaying(false); clearTimeout(stopAt) }
    audioRef.current = audio
    setPlaying(true)
  }

  const pxToSeconds = (px: number) => {
    const width = trackRef.current?.getBoundingClientRect().width || 1
    return (px / width) * CLIP_LENGTH
  }

  const beginDrag = (mode: 'left' | 'right' | 'move') => (e: React.PointerEvent) => {
    e.stopPropagation()
    stopAudio()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { mode, startX: e.clientX, origStart: start, origDuration: duration }
  }

  const onDragMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const deltaSec = pxToSeconds(e.clientX - drag.current.startX)
    const { mode, origStart, origDuration } = drag.current

    if (mode === 'left') {
      const newStart = Math.max(0, Math.min(origStart + deltaSec, origStart + origDuration - 1))
      setStart(newStart)
      setDuration(origStart + origDuration - newStart)
    } else if (mode === 'right') {
      const newDuration = Math.max(1, Math.min(origDuration + deltaSec, CLIP_LENGTH - origStart, sceneDuration))
      setDuration(newDuration)
    } else {
      const newStart = Math.max(0, Math.min(origStart + deltaSec, CLIP_LENGTH - origDuration))
      setStart(newStart)
    }
  }

  const endDrag = () => { drag.current = null }

  const leftPct = (start / CLIP_LENGTH) * 100
  const widthPct = (duration / CLIP_LENGTH) * 100

  return (
    // Small, compact, floats near the bottom (above the timeline/footer)
    // instead of a big banner - closer to how Facebook/Instagram do it.
    <div className="fixed bottom-24 left-4 right-4 z-[110] bg-[#1c1c1e] rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2">
      <button
        onClick={togglePreview}
        className="h-9 w-9 shrink-0 rounded-full bg-pink-500 flex items-center justify-center text-white"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      {/* Compact waveform + trim window */}
      <div ref={trackRef} className="relative flex-1 h-9 rounded-lg bg-black/40 overflow-hidden touch-none" onPointerMove={onDragMove} onPointerUp={endDrag}>
        {/* Waveform bars */}
        <div className="absolute inset-0 flex items-center justify-between px-1 gap-[1.5px]">
          {BAR_HEIGHTS.map((h, i) => (
            <span key={i} className="flex-1 bg-white/25 rounded-full" style={{ height: `${h}%` }} />
          ))}
        </div>
        {/* Trim window */}
        <div
          onPointerDown={beginDrag('move')}
          className="absolute top-0 bottom-0 bg-pink-500/30 border-y-2 border-pink-500 cursor-grab active:cursor-grabbing"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          <div onPointerDown={beginDrag('left')} className="absolute left-0 top-0 bottom-0 w-2.5 -ml-1.5 bg-pink-500 rounded-l-sm cursor-ew-resize" />
          <div onPointerDown={beginDrag('right')} className="absolute right-0 top-0 bottom-0 w-2.5 -mr-1.5 bg-pink-500 rounded-r-sm cursor-ew-resize" />
        </div>
      </div>

      <button
        onClick={() => { setStart(0); setDuration(Math.min(sceneDuration, CLIP_LENGTH)); stopAudio() }}
        className="h-9 w-9 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-white"
        title="Reset"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
      <button
        onClick={() => { stopAudio(); onDone(start, duration) }}
        className="h-9 w-9 shrink-0 rounded-full bg-white flex items-center justify-center text-black"
        title="Done"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}
