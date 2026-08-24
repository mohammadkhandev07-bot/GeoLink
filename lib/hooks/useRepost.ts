'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useIsReposted(postId: string, userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['is-reposted', postId, userId],
    queryFn: async () => {
      if (!userId) return false
      const { data } = await supabase
        .from('reposts')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
      return !!data
    },
    enabled: !!userId && !!postId,
  })
}

export function useToggleRepost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      postOwnerId,
      repost,
    }: {
      postId: string
      userId: string
      postOwnerId: string
      repost: boolean
    }) => {
      if (repost) {
        const { error } = await supabase.from('reposts').insert({ post_id: postId, user_id: userId })
        if (error) throw error
        if (userId !== postOwnerId) {
          await supabase.from('notifications').insert({
            user_id: postOwnerId,
            actor_id: userId,
            type: 'repost',
            post_id: postId,
          })
        }
      } else {
        const { error } = await supabase.from('reposts').delete().eq('post_id', postId).eq('user_id', userId)
        if (error) throw error
      }
    },
    onSuccess: (_, { postId, userId }) => {
      queryClient.invalidateQueries({ queryKey: ['is-reposted', postId, userId] })
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] })
    },
  })
}
