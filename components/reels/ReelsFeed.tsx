'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ReelCard } from './ReelCard'
import { PostWithProfile } from '@/lib/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ReelsFeedProps {
  reels: PostWithProfile[]
  isLoading: boolean
}

function SponsoredCard() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:transparent;'
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('frameborder', '0')
    ref.current.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(`<!DOCTYPE html><html><head>
      <style>body{margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;height:100vh;}</style>
      </head><body>
      <scr` + `ipt async data-cfasync="false" src="https://pl29784507.effectivecpmnetwork.com/5010391da71e8686d6575168cfc3d9fb/invoke.js"></scr` + `ipt>
      <div id="container-5010391da71e8686d6575168cfc3d9fb"></div>
      </body></html>`)
    doc.close()
  }, [])

  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black snap-start snap-always overflow-hidden flex items-center justify-center">
      <div className="absolute top-4 left-4 z-10">
        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
          Sponsored
        </span>
      </div>
      <div ref={ref} className="w-full h-full" />
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

  // Insert ad every 5 reels
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
