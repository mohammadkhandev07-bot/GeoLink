'use client'

import { useReelsPosts } from '@/lib/hooks/usePosts'
import { ReelsFeed } from '@/components/reels/ReelsFeed'

export default function ReelsPage() {
  const { data: reels = [], isLoading } = useReelsPosts()
  return <ReelsFeed reels={reels} isLoading={isLoading} />
}
