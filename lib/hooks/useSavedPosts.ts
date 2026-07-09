'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Defined locally (instead of imported from database.types.ts) so this file
// builds correctly on its own regardless of whether that file was updated.
export type SavedFolder = {
  id: string
  user_id: string
  name: string
  created_at: string
}

export type SavedPost = {
  id: string
  user_id: string
  post_id: string
  folder_id: string
  created_at: string
}

export const MAX_SAVED_FOLDERS = 10

// All of a user's folders, oldest first (so the default "first" folder stays stable).
export function useSavedFolders(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['saved-folders', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_folders')
        .select('*')
        .eq('user_id', userId as string)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as SavedFolder[]
    },
    enabled: !!userId,
  })
}

export function useCreateFolder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, name }: { userId: string; name: string }) => {
      const { data, error } = await supabase
        .from('saved_folders')
        .insert({ user_id: userId, name: name.trim() })
        .select()
        .single()
      if (error) {
        if (error.message.includes('Folder limit')) {
          throw new Error(`You can only have up to ${MAX_SAVED_FOLDERS} folders.`)
        }
        throw error
      }
      return data as SavedFolder
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-folders', variables.userId] })
    },
  })
}

// Set of post ids the current user has saved (in any folder) - used to show
// the filled/unfilled bookmark icon everywhere a post appears.
export function useSavedPostIds(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['saved-post-ids', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('post_id, folder_id')
        .eq('user_id', userId as string)
      if (error) throw error
      return data as { post_id: string; folder_id: string }[]
    },
    enabled: !!userId,
  })
}

export function useSavePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, postId, folderId }: { userId: string; postId: string; folderId: string }) => {
      const { error } = await supabase
        .from('saved_posts')
        .upsert({ user_id: userId, post_id: postId, folder_id: folderId }, { onConflict: 'user_id,post_id' })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-post-ids', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['saved-posts-in-folder'] })
    },
  })
}

export function useUnsavePost() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, postId }: { userId: string; postId: string }) => {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-post-ids', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['saved-posts-in-folder'] })
    },
  })
}

// All saved posts (with their post data) inside a specific folder.
export function useSavedPostsInFolder(folderId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['saved-posts-in-folder', folderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('*, posts(*, profiles(*))')
        .eq('folder_id', folderId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as any[]
    },
    enabled: !!folderId,
  })
}

export function useDeleteFolder() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, folderId }: { userId: string; folderId: string }) => {
      const { error } = await supabase.from('saved_folders').delete().eq('id', folderId)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saved-folders', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['saved-post-ids', variables.userId] })
    },
  })
}
