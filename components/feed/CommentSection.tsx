'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { CommentWithProfile } from '@/lib/types/database.types'
import { formatTimeAgo, getAvatarUrl } from '@/lib/utils/helpers'

export function CommentSection({ postId }: { postId: string }) {
  const [newComment, setNewComment] = useState('')
  const { user } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as CommentWithProfile[]
    },
  })

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      if (error) throw error
      await supabase.rpc('increment_comments', { post_id: postId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      setNewComment('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) addComment.mutate(newComment.trim())
  }

  return (
    <div className="px-4 pb-4 border-t pt-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={getAvatarUrl(comment.profiles.avatar_url)} />
                <AvatarFallback>{comment.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm">{comment.profiles.username} </span>
                <span className="text-sm">{comment.content}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(comment.created_at)}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          )}
        </div>
      )}

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={!newComment.trim() || addComment.isPending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      )}
    </div>
  )
}
