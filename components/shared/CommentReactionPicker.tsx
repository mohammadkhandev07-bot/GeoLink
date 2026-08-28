'use client'

import { useEffect, useRef } from 'react'
import { COMMENT_REACTION_EMOJIS } from '@/lib/hooks/useComments'

interface CommentReactionPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

// A tiny quick-pick emoji bar for reacting to a comment - opens right
// above the React button and closes itself on an outside click.
export function CommentReactionPicker({ onSelect, onClose }: CommentReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1.5 z-50 grid grid-cols-4 gap-0.5 bg-card border rounded-2xl shadow-lg p-1.5 w-max max-w-[13rem]"
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
