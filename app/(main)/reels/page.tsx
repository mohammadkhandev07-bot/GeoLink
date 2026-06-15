'use client'

import { useReelsPosts } from '@/lib/hooks/usePosts'
import { ReelsFeed } from '@/components/reels/ReelsFeed'

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useReelsPosts()
  return (
    <div className="fixed inset-0 bg-black z-30 lg:left-60 xl:left-72 top-14">
      <ReelsFeed reels={reels} isLoading={isLoading} />
    </div>
  )
}
