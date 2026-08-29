'use client'

import { useEffect, useRef, useState } from 'react'
import { COMMENT_REACTION_EMOJIS } from '@/lib/hooks/useComments'

interface CommentReactionPickerProps {
  /** The "React" button this picker opens next to. */
  anchorRef: React.RefObject<HTMLElement | null>
  onSelect: (emoji: string) => void
  onClose: () => void
}

const PICKER_WIDTH = 168
const PICKER_HEIGHT = 84

// A tiny quick-pick emoji grid for reacting to a comment. Positioned with
// `fixed` + coordinates read straight off the React button (not `absolute`
// inside the comment), so it's never clipped by a comment list's own
// Scroll container - which is exactly what happened when this opened on
// a comment sitting near the top of a scrollable panel (e.g. the first
// comment in a story's comments sheet): it flips to open downward
// instead of upward whenever there isn't room above, and stays clear of
// both screen edges horizontally.
export function CommentReactionPicker({ anchorRef, onSelect, onClose }: CommentReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const openBelow = rect.top < PICKER_HEIGHT + 12
    const top = openBelow ? rect.bottom + 6 : rect.top - PICKER_HEIGHT - 6
    const maxLeft = window.innerWidth - PICKER_WIDTH - 8
    const left = Math.min(Math.max(rect.left, 8), Math.max(maxLeft, 8))
    setPos({ top, left })
  }, [anchorRef])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    // Close on scroll too, since a fixed-position popover would
    // otherwise visually detach from its button as the list scrolls.
    const handleScroll = () => onClose()
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, anchorRef])

  if (!pos) return null

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: PICKER_WIDTH }}
      className="z-[200] grid grid-cols-4 gap-0.5 bg-card border rounded-2xl shadow-lg p-1.5"
    >
      {COMMENT_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onSelect(emoji)}
          className="text-lg leading-none p-1.5 rounded-full hover:bg-accent hover:scale-125 transition-transform"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
