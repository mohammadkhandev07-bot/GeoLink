'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { StoryWithProfile } from '@/lib/types/database.types'

export interface StoryGroup {
  userId: string
  profile: StoryWithProfile['profiles']
  stories: StoryWithProfile[]
}

// Groups this user's own + their followed accounts' active stories by
// author, most-recently-posted author first. "Active" here just means the
// Row is visible at all - the database RLS policy already hides anything
// past its 24h expires_at, so nothing extra needs to be checked here.
export function useActiveStories(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['active-stories', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false })

      if (error) throw error

      const stories = (data as StoryWithProfile[]) || []
      const groups = new Map<string, StoryGroup>()

      for (const story of stories) {
        const existing = groups.get(story.user_id)
        if (existing) {
          existing.stories.push(story)
        } else {
          groups.set(story.user_id, {
            userId: story.user_id,
            profile: story.profiles,
            stories: [story],
          })
        }
      }

      // Oldest-first within each person's own story ring, so viewers play
      // in the order they were posted.
      const result = Array.from(groups.values())
      result.forEach((g) => g.stories.reverse())

      // Own stories always come first, then everyone else by most recent story.
      result.sort((a, b) => {
        if (a.userId === userId) return -1
        if (b.userId === userId) return 1
        return 0
      })

      return result
    },
    enabled: !!userId,
    staleTime: 30000,
  })
}

interface CreateTextStoryInput {
  userId: string
  text: string
  backgroundColor: string
}

interface CreateMediaStoryInput {
  userId: string
  file: File
  storyType: 'photo' | 'video'
  overlayText?: string
  overlayX?: number
  overlayY?: number
}

export function useCreateStory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const invalidate = (userId: string) => {
    queryClient.invalidateQueries({ queryKey: ['active-stories', userId] })
  }

  const createTextStory = useMutation({
    mutationFn: async ({ userId, text, backgroundColor }: CreateTextStoryInput) => {
      const { error } = await supabase.from('stories').insert({
        user_id: userId,
        story_type: 'text',
        text_content: text,
        background_color: backgroundColor,
      })
      if (error) throw error
    },
    onSuccess: (_, { userId }) => invalidate(userId),
  })

  const createMediaStory = useMutation({
    mutationFn: async ({ userId, file, storyType, overlayText, overlayX, overlayY }: CreateMediaStoryInput) => {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage.from('stories').upload(path, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('stories').getPublicUrl(path)

      const { error } = await supabase.from('stories').insert({
        user_id: userId,
        story_type: storyType,
        media_url: urlData.publicUrl,
        overlay_text: overlayText || null,
        overlay_x: overlayX ?? 50,
        overlay_y: overlayY ?? 50,
      })
      if (error) throw error
    },
    onSuccess: (_, { userId }) => invalidate(userId),
  })

  return { createTextStory, createMediaStory }
}

export function useDeleteStory() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storyId, mediaUrl }: { storyId: string; mediaUrl?: string | null }) => {
      await supabase.from('stories').delete().eq('id', storyId)

      // Best-effort - also remove the file immediately rather than waiting
      // for the 24h cleanup job, since the user chose to delete it early.
      if (mediaUrl) {
        const marker = '/storage/v1/object/public/stories/'
        const idx = mediaUrl.indexOf(marker)
        if (idx !== -1) {
          const path = mediaUrl.slice(idx + marker.length)
          await supabase.storage.from('stories').remove([path])
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-stories'] })
    },
  })
}
