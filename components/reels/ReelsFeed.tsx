'use client'

import { useState, useRef, useCallback } from 'react'
import { ReelCard } from './ReelCard'
import { PostWithProfile } from '@/lib/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ReelsFeedProps {
  reels: PostWithProfile[]
  isLoading: boolean
}

export function ReelsFeed({ reels, isLoading }: ReelsFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const scrollTop = containerRef.current.scrollTop
    const height = containerRef.current.clientHeight
    const newIndex = Math.round(scrollTop / height)
    setActiveIndex(newIndex)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <LoadingSpinner className="text-white" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-black text-white">
        <p>No reels yet. Be the first to upload!</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {reels.map((reel, index) => (
        <ReelCard
          key={reel.id}
          post={reel}
          isActive={index === activeIndex}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(m => !m)}
        />
      ))}
    </div>
  )
}
