'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Volume2, VolumeX } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PostWithProfile } from '@/lib/types/database.types'
import { formatCount, getAvatarUrl } from '@/lib/utils/helpers'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'

interface ReelCardProps {
  post: PostWithProfile
  isActive: boolean
  isMuted: boolean
  onToggleMute: () => void
}

export function ReelCard({ post, isActive, isMuted, onToggleMute }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const { user } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted
  }, [isMuted])

  const handleLike = async () => {
    if (!user) return
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
  }

  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black snap-start snap-always">
      <video
        ref={videoRef}
        src={post.media_url ?? ''}
        loop
        playsInline
        muted={isMuted}
        className="absolute inset-0 w-full h-full object-contain"
      />

      {/* Dark overlay bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* Right actions */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-5 items-center z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart className={`h-7 w-7 drop-shadow ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          <span className="text-white text-xs font-medium drop-shadow">{formatCount(likesCount)}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="h-7 w-7 text-white drop-shadow" />
          <span className="text-white text-xs font-medium drop-shadow">{formatCount(post.comments_count)}</span>
        </button>
        <button onClick={onToggleMute}>
          {isMuted
            ? <VolumeX className="h-7 w-7 text-white drop-shadow" />
            : <Volume2 className="h-7 w-7 text-white drop-shadow" />
          }
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-3 right-16 z-10">
        <Link href={`/profile/${post.profiles.username}`} className="flex items-center gap-2 mb-2">
          <Avatar className="h-9 w-9 border-2 border-white">
            <AvatarImage src={getAvatarUrl(post.profiles.avatar_url)} />
            <AvatarFallback>{post.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow">{post.profiles.username}</span>
        </Link>
        {post.content && (
          <p className="text-white text-sm drop-shadow line-clamp-2">{post.content}</p>
        )}
      </div>
    </div>
  )
}
