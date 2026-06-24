'use client'

import { useState } from 'react'
import { PlusSquare } from 'lucide-react'
import { PostCard } from '@/components/feed/PostCard'
import { PostSkeleton } from '@/components/feed/PostSkeleton'
import { AdsterraBanner } from '@/components/shared/AdsterraBanner'
import { CreatePostModal } from '@/components/shared/CreatePostModal'
import { useFeedPosts } from '@/lib/hooks/usePosts'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'

export default function FeedPage() {
  const { user, profile } = useUser()
  const { data: posts = [], isLoading } = useFeedPosts(user?.id)
  const [showCreate, setShowCreate] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Create Post Box */}
      {profile && (
        <div className="m-4 mb-2 border rounded-xl bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
              <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => setShowCreate(true)}
              className="flex-1 text-left bg-muted rounded-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              What's on your mind, {profile.full_name || profile.username}?
            </button>
          </div>
          <div className="flex gap-1 mt-3 pt-3 border-t">
            <button onClick={() => setShowCreate(true)}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground font-medium">
              <span>📸</span> Photo
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground font-medium">
              <span>🎬</span> Reel
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm text-muted-foreground font-medium">
              <span>✍️</span> Text
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      <div>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.length === 0
          ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-medium">Your feed is empty</p>
              <p className="text-sm mt-1">Follow people to see their posts here</p>
            </div>
          )
          : posts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} onDelete={handleDeletePost} />
              {(index + 1) % 4 === 0 && (
                <div className="border-y bg-muted/20 py-1">
                  <AdsterraBanner slotKey={`feed_${index}`} />
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Create Post Modal */}
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
