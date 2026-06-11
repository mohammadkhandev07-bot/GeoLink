'use client'

import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { Grid3x3, Film, Lock } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'
import { Skeleton } from '@/components/ui/skeleton'

interface ProfileTabsProps {
  profileId: string
  isPrivate: boolean
  isFollowing: boolean
  isOwn: boolean
}

export function ProfileTabs({ profileId, isPrivate, isFollowing, isOwn }: ProfileTabsProps) {
  const supabase = createClient()
  const canView = !isPrivate || isFollowing || isOwn

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

  const imagePosts = posts.filter((p) => p.media_type === 'image' || !p.media_url)
  const videoPosts = posts.filter((p) => p.media_type === 'video')

  return (
    <Tabs defaultValue="posts" className="w-full">
      <TabsList className="w-full rounded-none border-b bg-transparent h-auto">
        <TabsTrigger value="posts" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
          <Grid3x3 className="h-4 w-4" />
          Posts
        </TabsTrigger>
        <TabsTrigger value="reels" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
          <Film className="h-4 w-4" />
          Reels
        </TabsTrigger>
      </TabsList>

      <TabsContent value="posts">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        ) : imagePosts.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Grid3x3 className="h-12 w-12 mb-2" />
            <p>No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {imagePosts.map((post) => (
              <div key={post.id} className="relative aspect-square bg-muted overflow-hidden">
                {post.media_url ? (
                  <Image src={post.media_url} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full p-2">
                    <p className="text-xs text-center text-muted-foreground line-clamp-4">{post.content}</p>
                  </div>
                )}
              </div>
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
            {videoPosts.map((post) => (
              <div key={post.id} className="relative aspect-[9/16] bg-muted overflow-hidden">
                <video src={post.media_url ?? ''} className="w-full h-full object-cover" preload="metadata" />
                <Film className="absolute bottom-2 right-2 h-4 w-4 text-white drop-shadow" />
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
