'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Bookmark } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CommentSection } from './CommentSection'
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
  const [likeLoading, setLikeLoading] = useState(false)
  const supabase = createClient()
  const queryClient = useQueryClient()

  // DB se like status fetch karo - har baar component load hone par
  useEffect(() => {
    if (!user) return
    supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setLiked(!!data)
      })
  }, [post.id, user?.id])

  // is_liked prop se bhi set karo agar available ho
  useEffect(() => {
    if (post.is_liked !== undefined) {
      setLiked(post.is_liked)
    }
  }, [post.is_liked])

  const handleLike = async () => {
    if (!user || likeLoading) return
    setLikeLoading(true)

    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1)

    if (newLiked) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.rpc('increment_likes', { post_id: post.id })
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.rpc('decrement_likes', { post_id: post.id })
    }

    // Invalidate all post queries so like shows everywhere
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
    queryClient.invalidateQueries({ queryKey: ['explore-posts'] })
    queryClient.invalidateQueries({ queryKey: ['reels-posts'] })
    queryClient.invalidateQueries({ queryKey: ['profile-posts'] })

    setLikeLoading(false)
  }

  const isOwner = user?.id === post.user_id

  return (
    <article className="border-b bg-card">
      {/* Header */}
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete?.(post.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <div className="relative w-full bg-muted" style={{ maxHeight: '480px', aspectRatio: '4/3' }}>
          <Image
            src={post.media_url}
            alt="Post"
            fill
            className="object-contain"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {post.media_url && post.media_type === 'video' && (
        <div className="w-full bg-black" style={{ maxHeight: '480px' }}>
          <video
            src={post.media_url}
            controls
            className="w-full"
            style={{ maxHeight: '480px', objectFit: 'contain' }}
            preload="metadata"
          />
        </div>
      )}

      {/* Caption */}
      {post.content && (
        <div className="px-4 pt-2 pb-1">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold mr-1">{post.profiles.username}</span>
            {post.content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleLike}
            disabled={likeLoading}
          >
            <Heart className={`h-5 w-5 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowComments(!showComments)}>
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>

      {/* Likes count */}
      {likesCount > 0 && (
        <p className="px-4 text-sm font-semibold pb-1">{formatCount(likesCount)} likes</p>
      )}

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  )
}
