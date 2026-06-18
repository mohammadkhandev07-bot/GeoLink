'use client'

import { useState, useRef, useCallback } from 'react'
import { ReelCard } from './ReelCard'
import { PostWithProfile } from '@/lib/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface ReelsFeedProps {
  reels: PostWithProfile[]
  isLoading: boolean
}

// Ad card component
function ReelAdCard() {
  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black snap-start snap-always flex flex-col items-center justify-center">
      {/* Sponsored label */}
      <div className="absolute top-16 left-4 z-20">
        <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
          Sponsored
        </span>
      </div>

      {/* Ad content - iframe isolated */}
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <AdSlot />
      </div>
    </div>
  )
}

function AdSlot() {
  const ref = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useCallback(() => {
    if (!ref.current || loaded.current) return
    loaded.current = true

    const iframe = document.createElement('iframe')
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    iframe.style.background = 'transparent'
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('frameborder', '0')
    ref.current.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    doc.open()
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin:0; padding:0; background: transparent; display:flex; align-items:center; justify-content:center; height:100vh; }
  </style>
</head>
<body>
  <scr` + `ipt async="async" data-cfasync="false"
    src="https://pl29784507.effectivecpmnetwork.com/5010391da71e8686d6575168cfc3d9fb/invoke.js">
  </scr` + `ipt>
  <div id="container-5010391da71e8686d6575168cfc3d9fb"></div>
</body>
</html>`)
    doc.close()
  }, [])

  return (
    <div
      ref={ref}
      style={{ width: '100%', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Ad loads here */}
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
      <div className="flex h-full items-center justify-center bg-black text-white">
        <p>No reels yet. Be the first to upload!</p>
      </div>
    )
  }

  // Insert ad after every 5 reels
  const items: (PostWithProfile | 'ad')[] = []
  reels.forEach((reel, i) => {
    items.push(reel)
    if ((i + 1) % 5 === 0) {
      items.push('ad')
    }
  })

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {items.map((item, index) => {
        if (item === 'ad') {
          return <ReelAdCard key={`ad-${index}`} />
        }

        // Calculate real reel index (excluding ads)
        const reelIndex = items.slice(0, index).filter(i => i !== 'ad').length

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
