'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, MoreHorizontal, Trash2 } from 'lucide-react'
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

interface PostCardProps {
  post: PostWithProfile
  onDelete?: (postId: string) => void
}

export function PostCard({ post, onDelete }: PostCardProps) {
  const { user } = useUser()
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [showComments, setShowComments] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!user) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1))

    if (newLiked) {
      await supabase.from('likes').insert({ post_id: post.id, user_id: user.id })
      await supabase.rpc('increment_likes', { post_id: post.id })
    } else {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id)
      await supabase.rpc('decrement_likes', { post_id: post.id })
    }
  }

  const isOwner = user?.id === post.user_id

  return (
    <article className="border-b bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link href={`/profile/${post.profiles.username}`} className="flex items-center gap-3">
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
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(post.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Post
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <div className="relative aspect-square sm:aspect-video w-full bg-muted">
          <Image
            src={post.media_url}
            alt="Post media"
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {post.media_url && post.media_type === 'video' && (
        <video
          src={post.media_url}
          controls
          className="w-full max-h-96 bg-black"
          preload="metadata"
        />
      )}

      {/* Content */}
      {post.content && (
        <p className="px-4 py-2 text-sm leading-relaxed">{post.content}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 pb-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLike}>
          <Heart
            className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : ''}`}
          />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[2ch]">{formatCount(likesCount)}</span>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 ml-1"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        <span className="text-sm text-muted-foreground">{formatCount(post.comments_count)}</span>

        <Button variant="ghost" size="icon" className="h-9 w-9 ml-1">
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  )
}
