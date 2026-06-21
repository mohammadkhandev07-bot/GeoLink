'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { Grid3x3, Film, Lock, X, Play, Heart, MessageCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCount } from '@/lib/utils/helpers'

interface ProfileTabsProps {
  profileId: string
  isPrivate: boolean
  isFollowing: boolean
  isOwn: boolean
}

export function ProfileTabs({ profileId, isPrivate, isFollowing, isOwn }: ProfileTabsProps) {
  const supabase = createClient()
  const canView = !isPrivate || isFollowing || isOwn
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null)

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['profile-posts', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PostWithProfile[]
    },
    enabled: canView,
  })

  if (!canView) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Lock className="h-12 w-12" />
        <p className="font-semibold">This account is private</p>
        <p className="text-sm">Follow to see their posts</p>
      </div>
    )
  }

  const imagePosts = posts.filter(p => p.media_type === 'image' || !p.media_url)
  const videoPosts = posts.filter(p => p.media_type === 'video')

  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent h-auto">
          <TabsTrigger value="posts" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
            <Grid3x3 className="h-4 w-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
            <Film className="h-4 w-4" /> Reels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
            </div>
          ) : imagePosts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Grid3x3 className="h-12 w-12 mb-2" />
              <p>No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {imagePosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-square bg-muted overflow-hidden group"
                >
                  {post.media_url ? (
                    <Image src={post.media_url} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <div className="flex items-center justify-center h-full p-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                      <p className="text-xs text-center text-muted-foreground line-clamp-4">{post.content}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-3 text-white text-sm font-semibold">
                      <span className="flex items-center gap-1"><Heart className="h-4 w-4 fill-white" />{formatCount(post.likes_count)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4 fill-white" />{formatCount(post.comments_count)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reels">
          {videoPosts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Film className="h-12 w-12 mb-2" />
              <p>No reels yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {videoPosts.map(post => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="relative aspect-[9/16] bg-muted overflow-hidden group"
                >
                  <video src={post.media_url ?? ''} className="w-full h-full object-cover" preload="metadata" muted />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 rounded-full p-2">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <Heart className="h-3 w-3 fill-white" />
                      <span>{formatCount(post.likes_count)}</span>
                    </div>
                  </div>
                  <Film className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow" />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Post/Reel Viewer Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 z-10 bg-white/20 rounded-full p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {selectedPost.media_type === 'video' ? (
              <video
                src={selectedPost.media_url ?? ''}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-2xl"
                style={{ objectFit: 'contain', background: '#000' }}
              />
            ) : selectedPost.media_url ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black">
                <Image
                  src={selectedPost.media_url}
                  alt=""
                  width={400}
                  height={400}
                  className="w-full object-contain rounded-2xl"
                />
              </div>
            ) : (
              <div className="bg-card rounded-2xl p-6">
                <p className="text-sm">{selectedPost.content}</p>
              </div>
            )}

            {/* Info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-2xl">
              <p className="text-white font-semibold text-sm">@{selectedPost.profiles?.username}</p>
              {selectedPost.content && (
                <p className="text-white/70 text-xs mt-1 line-clamp-2">{selectedPost.content}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-white text-xs">
                  <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                  {formatCount(selectedPost.likes_count)}
                </span>
                <span className="flex items-center gap-1 text-white text-xs">
                  <MessageCircle className="h-3.5 w-3.5 fill-white text-white" />
                  {formatCount(selectedPost.comments_count)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
