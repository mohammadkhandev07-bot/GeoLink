'use client'

import { useReelsPosts } from '@/lib/hooks/usePosts'
import { ReelsFeed } from '@/components/reels/ReelsFeed'

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useReelsPosts()
  return (
    <div className="flex justify-center items-start bg-black min-h-[calc(100vh-3.5rem)]">
      {/* Mobile: full width, Desktop: fixed width like Instagram */}
      <div
        className="relative bg-black"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: 'calc(100vh - 3.5rem)',
        }}
      >
        <ReelsFeed reels={reels} isLoading={isLoading} />
      </div>
    </div>
  )
}
