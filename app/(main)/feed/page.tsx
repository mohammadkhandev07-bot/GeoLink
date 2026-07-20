'use client'

import { useState } from 'react'
import { PostCard } from '@/components/feed/PostCard'
import { PostSkeleton } from '@/components/feed/PostSkeleton'
import { AdsterraBanner } from '@/components/shared/AdsterraBanner'
import { StoriesBar } from '@/components/stories/StoriesBar'
import { useFeedPosts } from '@/lib/hooks/usePosts'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export default function FeedPage() {
  const { user } = useUser()
  const { data: posts = [], isLoading } = useFeedPosts(user?.id)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Stories */}
      <StoriesBar />

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
    </div>
  )
} 
