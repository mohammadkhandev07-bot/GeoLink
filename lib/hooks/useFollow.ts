'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useFollowStatus(followerId?: string, followingId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['follow-status', followerId, followingId],
    queryFn: async () => {
      if (!followerId || !followingId) return null
      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single()
      return data
    },
    enabled: !!followerId && !!followingId,
  })
}

export function useFollowUser() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      followerId,
      followingId,
      isPrivate,
    }: {
      followerId: string
      followingId: string
      isPrivate: boolean
    }) => {
      const { error } = await supabase.from('follows').insert({
        follower_id: followerId,
        following_id: followingId,
        status: isPrivate ? 'pending' : 'accepted',
      })
      if (error) throw error

      if (!isPrivate) {
        await supabase.rpc('increment_followers', { profile_id: followingId })
        await supabase.rpc('increment_following', { profile_id: followerId })
        await supabase.from('notifications').insert({
          user_id: followingId,
          actor_id: followerId,
          type: 'follow',
        })
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', variables.followerId, variables.followingId] })
    },
  })
}

export function useUnfollowUser() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      // Check current status first - counts were only incremented when the
      // follow was 'accepted', so we should only decrement in that case.
      const { data: existing } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single()

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
      if (error) throw error

      if (existing?.status === 'accepted') {
        await supabase.rpc('decrement_followers', { profile_id: followingId })
        await supabase.rpc('decrement_following', { profile_id: followerId })
        await supabase.from('notifications').insert({
          user_id: followingId,
          actor_id: followerId,
          type: 'unfollow',
        })
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['follow-status', variables.followerId, variables.followingId] })
    },
  })
}

export function useFollowRequests(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['follow-requests', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('follows')
        .select('*, profiles!follows_follower_id_fkey(*)')
        .eq('following_id', userId)
        .eq('status', 'pending')

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

export function useRespondToFollowRequest() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      followId,
      followerId,
      followingId,
      action,
    }: {
      followId: string
      followerId: string
      followingId: string
      action: 'accepted' | 'rejected'
    }) => {
      if (action === 'accepted') {
        await supabase.from('follows').update({ status: 'accepted' }).eq('id', followId)
        await supabase.rpc('increment_followers', { profile_id: followingId })
        await supabase.rpc('increment_following', { profile_id: followerId })
        await supabase.from('notifications').insert({
          user_id: followingId,
          actor_id: followerId,
          type: 'follow',
        })
      } else {
        await supabase.from('follows').delete().eq('id', followId)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['follow-requests', variables.followingId] })
    },
  })
}
