'use client'

import { useEffect, useRef } from 'react'
import { Trash2, Copy, Type, Palette, PaintBucket } from 'lucide-react'

interface SceneMenuProps {
  onClose: () => void
  onDelete: () => void
  onDuplicate: () => void
  onEditText: () => void
  onChangeTextColor: () => void
  onChangeBackground: () => void
  canDelete: boolean
}

export function SceneMenu({
  onClose, onDelete, onDuplicate, onEditText, onChangeTextColor, onChangeBackground, canDelete,
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

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-1 left-0 z-30 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-48"
    >
      {item(<Type className="h-4 w-4" />, 'Edit Text', onEditText)}
      {item(<Palette className="h-4 w-4" />, 'Change Text Color', onChangeTextColor)}
      {item(<PaintBucket className="h-4 w-4" />, 'Change Background', onChangeBackground)}
      {item(<Copy className="h-4 w-4" />, 'Duplicate Scene', onDuplicate)}
      {canDelete && item(<Trash2 className="h-4 w-4" />, 'Delete Scene', onDelete, true)}
    </div>
  )
} 
