'use client'

import { useEffect, useRef } from 'react'
import { Trash2, Copy, Type, Palette, PaintBucket, Music } from 'lucide-react'

interface SceneMenuProps {
  anchorX: number
  anchorY: number
  onClose: () => void
  onDelete: () => void
  onDuplicate: () => void
  onEditText: () => void
  onChangeTextColor: () => void
  onChangeBackground: () => void
  onSeparateSong: () => void
  hasSeparateSong: boolean
  canDelete: boolean
}

export function SceneMenu({
  anchorX, anchorY, onClose, onDelete, onDuplicate, onEditText, onChangeTextColor, onChangeBackground,
  onSeparateSong, hasSeparateSong, canDelete,
}: SceneMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const item = (icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean) => (
    <button
      onClick={() => { onClick(); onClose() }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors ${danger ? 'text-red-400' : 'text-white'}`}
    >
      {icon}
      {label}
    </button>
  )

  // Fixed to the viewport (not a descendant of the timeline's scrolling
  // track), and opens upward from the 3-dot button's exact position - this
  // Is what actually escapes that track's overflow clipping.
  return (
    <div
      ref={ref}
      style={{ left: `${Math.max(8, anchorX - 180)}px`, bottom: `${window.innerHeight - anchorY + 6}px` }}
      className="fixed z-[130] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-48"
    >
      {item(<Type className="h-4 w-4" />, 'Edit Text', onEditText)}
      {item(<Palette className="h-4 w-4" />, 'Change Text Color', onChangeTextColor)}
      {item(<PaintBucket className="h-4 w-4" />, 'Change Background', onChangeBackground)}
      {item(<Music className="h-4 w-4" />, hasSeparateSong ? 'Edit Separate Song' : 'Add Separate Song', onSeparateSong)}
      {item(<Copy className="h-4 w-4" />, 'Duplicate Scene', onDuplicate)}
      {canDelete && item(<Trash2 className="h-4 w-4" />, 'Delete Scene', onDelete, true)}
    </div>
  )
}
