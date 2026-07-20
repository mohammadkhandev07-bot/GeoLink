'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { useActiveStories } from '@/lib/hooks/useStories'
import { useUser } from '@/lib/hooks/useUser'
import { CreateStoryModal } from './CreateStoryModal'
import { StoryViewer } from './StoryViewer'

export function StoriesBar() {
  const { user, profile } = useUser()
  const { data: groups = [] } = useActiveStories(user?.id)
  const [showCreate, setShowCreate] = useState(false)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  if (!profile) return null

  const myGroup = groups.find((g) => g.userId === user?.id)
  const otherGroups = groups.filter((g) => g.userId !== user?.id)

  return (
    <div className="mx-4 mt-4 mb-2">
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {/* Your Story bubble */}
        <button
          onClick={() => (myGroup ? setViewerIndex(groups.indexOf(myGroup)) : setShowCreate(true))}
          className="flex flex-col items-center gap-1 shrink-0 w-16"
        >
          <div className={`relative h-16 w-16 rounded-full flex items-center justify-center ${myGroup ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 p-[2px]' : ''}`}>
            <Avatar className="h-full w-full border-2 border-background">
              <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
              <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreate(true) }}
              className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-pink-500 border-2 border-background flex items-center justify-center"
            >
              <Plus className="h-3 w-3 text-white" />
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground truncate w-full text-center">Your Story</span>
        </button>

        {/* Friends' stories */}
        {otherGroups.map((group) => (
          <button
            key={group.userId}
            onClick={() => setViewerIndex(groups.indexOf(group))}
            className="flex flex-col items-center gap-1 shrink-0 w-16"
          >
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 p-[2px]">
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={getAvatarUrl(group.profile?.avatar_url)} />
                <AvatarFallback>{group.profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[11px] text-muted-foreground truncate w-full text-center">{group.profile?.username}</span>
          </button>
        ))}
      </div>

      {showCreate && user && <CreateStoryModal userId={user.id} onClose={() => setShowCreate(false)} />}

      {viewerIndex !== null && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerIndex}
          currentUserId={user?.id}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
} 
