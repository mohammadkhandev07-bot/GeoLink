'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, X, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'

export default function LikedPage() {
  const { user, loading } = useUser()
  const supabase = createClient()
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null)

  const { data: likedPosts = [], isLoading } = useQuery({
    queryKey: ['liked-posts', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('likes')
        .select('post_id, posts(*, profiles(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((d: any) => d.posts).filter(Boolean) as PostWithProfile[]
    },
    enabled: !!user,
  })

  if (loading) return <PageLoader />

  const videos = likedPosts.filter(p => p.media_type === 'video')
  const images = likedPosts.filter(p => p.media_type === 'image' || p.media_type === 'none')

  return (
    <div className="max-w-xl mx-auto pb-20">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500 fill-pink-500" />
          <h1 className="text-xl font-bold">Liked Videos</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {likedPosts.length} liked {likedPosts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : likedPosts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-pink-500/10 flex items-center justify-center">
            <Heart className="h-10 w-10 text-pink-500/50" />
          </div>
          <div>
            <p className="text-lg font-semibold">No liked posts yet</p>
            <p className="text-sm mt-1">Posts and videos you like will appear here</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Videos */}
          {videos.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Videos ({videos.length})
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {videos.map(post => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] group"
                  >
                    <video
                      src={post.media_url ?? ''}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    {/* Play icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/40 rounded-full p-3">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium truncate">@{post.profiles?.username}</p>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Heart className="h-4 w-4 fill-red-500 text-red-500 drop-shadow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Posts ({images.length})
              </h2>
              <div className="grid grid-cols-3 gap-1">
                {images.map(post => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                  >
                    {post.media_url ? (
                      <Image src={post.media_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full p-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                        <p className="text-xs text-center text-muted-foreground line-clamp-3">{post.content}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-1 right-1">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500 drop-shadow" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video/Post Viewer Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 z-10 bg-white/20 rounded-full p-2 text-white hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-sm max-h-[85vh] rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {selectedPost.media_type === 'video' ? (
              <video
                src={selectedPost.media_url ?? ''}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-2xl"
                style={{ objectFit: 'contain' }}
              />
            ) : selectedPost.media_url ? (
              <Image
                src={selectedPost.media_url}
                alt=""
                width={400}
                height={400}
                className="w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="bg-card rounded-2xl p-6">
                <p className="text-sm">{selectedPost.content}</p>
              </div>
            )}

            {/* Post info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-2xl">
              <Link
                href={`/profile/${selectedPost.profiles?.username}`}
                onClick={() => setSelectedPost(null)}
                className="text-white font-semibold text-sm hover:underline"
              >
                @{selectedPost.profiles?.username}
              </Link>
              {selectedPost.content && (
                <p className="text-white/70 text-xs mt-1 line-clamp-2">{selectedPost.content}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
