'use client'

import { useState, useRef, useCallback } from 'react'
import { ReelCard } from './ReelCard'
import { PostWithProfile } from '@/lib/types/database.types'
import { AdsterraBanner } from '@/components/shared/AdsterraBanner'
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
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingSpinner className="text-white" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <p>No reels yet. Be the first to upload!</p>
      </div>
    )
  }

  // Insert ad every 3 reels
  const reelsWithAds: (PostWithProfile | 'ad')[] = []
  reels.forEach((reel, i) => {
    reelsWithAds.push(reel)
    if ((i + 1) % 3 === 0) reelsWithAds.push('ad')
  })

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-screen overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none' }}
    >
      {reelsWithAds.map((item, index) => {
        if (item === 'ad') {
          return (
            <div
              key={`ad-${index}`}
              className="h-screen w-full flex-shrink-0 bg-black snap-start snap-always flex items-center justify-center"
            >
              <AdsterraBanner slotKey="reels_slot" width={320} height={480} />
            </div>
          )
        }
        return (
          <ReelCard
            key={item.id}
            post={item}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
          />
        )
      })}
    </div>
  )
}
