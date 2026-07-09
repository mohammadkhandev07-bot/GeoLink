'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ShareModal } from '@/components/shared/ShareModal'
import { PostCaption } from '@/components/shared/PostCaption'
import { SaveButton } from '@/components/shared/SaveButton'
import { PostWithProfile } from '@/lib/types/database.types'
import { formatTimeAgo, formatCount, getAvatarUrl } from '@/lib/utils/helpers'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { useQueryClient } from '@tanstack/react-query'

interface PostCardProps {
  post: PostWithProfile
  onDelete?: (postId: string) => void
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useUser()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return
    if (post.is_liked !== undefined) { setLiked(post.is_liked); return }
    supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [post.id, user?.id])

  const loadComments = async () => {
    if (commentsLoaded) return
    const { data } = await supabase.from('comments').select('*, profiles(*)')
      .eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data || [])
    setCommentsLoaded(true)
  }

  const toggleComments = async () => {
    if (!showComments) await loadComments()
    setShowComments(!showComments)
  }

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1)
    if (newLiked) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.rpc('increment_likes', { post_id: post.id })
      if (user.id !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, actor_id: user.id, type: 'like', post_id: post.id,
        })
      }
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.rpc('decrement_likes', { post_id: post.id })
    }
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
    queryClient.invalidateQueries({ queryKey: ['explore-posts'] })
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return
    setSubmitting(true)
    const { data } = await supabase.from('comments')
      .insert({ post_id: post.id, user_id: user.id, content: newComment.trim() })
      .select('*, profiles(*)').single()
    if (data) {
      setComments(prev => [...prev, data])
      await supabase.rpc('increment_comments', { post_id: post.id })
      if (user.id !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id, actor_id: user.id, type: 'comment', message: newComment.trim(), post_id: post.id,
        })
      }
    }
    setNewComment('')
    setSubmitting(false)
  }

  const isOwner = user?.id === post.user_id

  return (
    <article className="border-b bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/profile/${post.profiles.username}`} className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            <AvatarImage src={getAvatarUrl(post.profiles.avatar_url)} />
            <AvatarFallback>{post.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-none">{post.profiles.username}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(post.created_at)}</p>
          </div>
        </Link>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(post.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {post.media_url && post.media_type === 'image' && (
        <div className="relative w-full bg-muted" style={{ maxHeight: '480px', aspectRatio: '4/3' }}>
          <Image src={post.media_url} alt="Post" fill className="object-contain" sizes="(max-width: 640px) 100vw, 600px" />
        </div>
      )}
      {post.media_url && post.media_type === 'video' && (
        <div className="w-full bg-black" style={{ maxHeight: '480px' }}>
          <video src={post.media_url} controls className="w-full" style={{ maxHeight: '480px', objectFit: 'contain' }} preload="metadata" />
        </div>
      )}

      {post.content && (
        <div className="px-4 pt-2 pb-1">
          <PostCaption
            content={post.content}
            forceExpanded={!post.media_url}
            prefix={<span className="font-semibold mr-1">{post.profiles.username} </span>}
          />
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLike}>
            <Heart className={`h-5 w-5 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleComments}>
            <MessageCircle className={`h-5 w-5 ${showComments ? 'fill-foreground' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowShare(true)}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
        <SaveButton postId={post.id} className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-accent transition-colors" />
      </div>

      {likesCount > 0 && <p className="px-4 text-sm font-semibold pb-1">{formatCount(likesCount)} likes</p>}

      {showComments && (
        <div className="border-t px-4 pt-3 pb-3">
          <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No comments yet!</p>
            ) : comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={getAvatarUrl(c.profiles?.avatar_url)} />
                  <AvatarFallback className="text-[10px]">{c.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><span className="font-semibold mr-1">{c.profiles?.username}</span>{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(c.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          {comments.length > 0 && <p className="text-xs text-muted-foreground mb-2">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>}
          {user && (
            <form onSubmit={handleComment} className="flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-muted rounded-full px-3 py-1.5 text-sm outline-none border border-transparent focus:border-pink-500" />
              <button type="submit" disabled={!newComment.trim() || submitting} className="text-pink-500 disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      )}

      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
    </article>
  )
}
