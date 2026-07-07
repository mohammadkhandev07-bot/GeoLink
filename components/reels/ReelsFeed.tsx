'use client'

import { useState, useRef, useCallback } from 'react'
import { ReelCard } from './ReelCard'
import { PostWithProfile } from '@/lib/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ReelsFeedProps {
  reels: PostWithProfile[]
  isLoading: boolean
}

function SponsoredCard() {
  return (
    <div className="relative w-full h-full flex-shrink-0 bg-gradient-to-b from-gray-900 to-black snap-start snap-always overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute top-16 left-4 z-20">
        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
          Sponsored
        </span>
      </div>

      <div className="absolute top-16 right-4 z-20">
        <span className="text-white/50 text-xs">Scroll to skip ↓</span>
      </div>

      {/*
        MONETAG AD GOES HERE
        --------------------
        This card sits between every 5th reel (see the `items` loop below) and is
        naturally skippable by scrolling, exactly like the other reels.
        Paste your Monetag "Native Banner" ad unit's embed code inside this div
        (it's the ad format meant to sit inline inside a content feed like this one).
      */}
      <div id="monetag-native-ad-slot" className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
          <span className="text-2xl">📢</span>
        </div>
        <p className="text-white/60 text-sm">Advertisement</p>
      </div>
    </div>
  )
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
      <div className="flex flex-col h-full items-center justify-center bg-black text-white gap-3">
        <div className="text-5xl">🎬</div>
        <p className="font-semibold">No reels yet</p>
        <p className="text-sm text-white/50">Be the first to upload!</p>
      </div>
    )
  }

  const items: (PostWithProfile | 'ad')[] = []
  reels.forEach((reel, i) => {
    items.push(reel)
    if ((i + 1) % 5 === 0) items.push('ad')
  })

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {items.map((item, index) => {
        if (item === 'ad') return <SponsoredCard key={`ad-${index}`} />
        return (
          <ReelCard
            key={(item as PostWithProfile).id}
            post={item as PostWithProfile}
            isActive={index === activeIndex}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(m => !m)}
          />
        )
      })}
    </div>
  )
}
