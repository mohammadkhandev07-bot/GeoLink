'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'

async function fetchPostsWithLikes(posts: PostWithProfile[], userId: string) {
  const supabase = createClient()
  if (!posts.length || !userId) return posts

  const postIds = posts.map(p => p.id)
  const { data: likes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds)

  const likedSet = new Set(likes?.map(l => l.post_id) ?? [])
  return posts.map(p => ({ ...p, is_liked: likedSet.has(p.id) }))
}

export function useFeedPosts(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['feed-posts', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')

      const followingIds = following?.map(f => f.following_id) ?? []
      followingIds.push(userId)

      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return fetchPostsWithLikes(data as PostWithProfile[], userId)
    },
    enabled: !!userId,
    staleTime: 30000,
  })
}

export function useExplorePosts(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['explore-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('likes_count', { ascending: false })
        .limit(30)

      if (error) throw error
      if (!userId) return data as PostWithProfile[]
      return fetchPostsWithLikes(data as PostWithProfile[], userId)
    },
    staleTime: 30000,
  })
}

export function useReelsPosts(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reels-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!userId) return data as PostWithProfile[]
      return fetchPostsWithLikes(data as PostWithProfile[], userId)
    },
    staleTime: 30000,
  })
}
