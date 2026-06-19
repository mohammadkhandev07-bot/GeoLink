'use client'

import { useReelsPosts } from '@/lib/hooks/usePosts'
import { ReelsFeed } from '@/components/reels/ReelsFeed'

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useReelsPosts()
  return (
    <div
      className="fixed bg-black z-30"
      style={{
        top: '3.5rem',
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <ReelsFeed reels={reels} isLoading={isLoading} />
    </div>
  )
}
