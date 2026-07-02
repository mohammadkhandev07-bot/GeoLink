'use client'

import { useReelsPosts } from '@/lib/hooks/usePosts'
import { ReelsFeed } from '@/components/reels/ReelsFeed'
import { useUser } from '@/lib/hooks/useUser'

export default function ReelsPage() {
  const { user } = useUser()
  const { data: reels = [], isLoading } = useReelsPosts(user?.id)

  return (
    <div className="flex justify-center items-start bg-black min-h-[calc(100vh-3.5rem)]">
      <div
        className="relative bg-black"
        style={{
          width: '100%',
          maxWidth: '420px',
          height: 'calc(100vh - 3.5rem)',
        }}
      >
        {/* Mobile pe 80% height - 20% chota */}
        <style>{`
          @media (max-width: 768px) {
            .reels-container {
              height: 80vh !important;
              margin: auto;
              border-radius: 12px;
              overflow: hidden;
            }
          }
        `}</style>
        <div className="reels-container w-full h-full">
          <ReelsFeed reels={reels} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
