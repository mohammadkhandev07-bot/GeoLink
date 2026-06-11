'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'

export function useFeedPosts(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['feed-posts', userId],
    queryFn: async () => {
      if (!userId) return []

      // Get following list
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted')

      const followingIds = following?.map((f) => f.following_id) ?? []
      followingIds.push(userId) // include own posts

      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data as PostWithProfile[]
    },
    enabled: !!userId,
  })
}

export function useExplorePosts() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['explore-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .order('likes_count', { ascending: false })
        .limit(30)

      if (error) throw error
      return data as PostWithProfile[]
    },
  })
}

export function useReelsPosts() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['reels-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('media_type', 'video')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as PostWithProfile[]
    },
  })
}

export function useLikePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, userId, isLiked }: { postId: string; userId: string; isLiked: boolean }) => {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId)
        await supabase.from('posts').update({ likes_count: supabase.rpc('decrement', { x: 1 }) as unknown as number }).eq('id', postId)
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: userId })
        await supabase.rpc('increment_likes', { post_id: postId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
      queryClient.invalidateQueries({ queryKey: ['explore-posts'] })
    },
  })
}

export function useDeletePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
      queryClient.invalidateQueries({ queryKey: ['explore-posts'] })
    },
  })
}
