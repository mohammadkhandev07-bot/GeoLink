'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Volume2, VolumeX, Share2, Bookmark } from 'lucide-react'
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
  const [paused, setPaused] = useState(false)
  const { user } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
      setPaused(false)
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [isActive])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted
  }, [isMuted])

  const handleTap = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setPaused(false)
    } else {
      videoRef.current.pause()
      setPaused(true)
    }
  }

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
    <div className="relative w-full h-full flex-shrink-0 bg-black snap-start snap-always overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={post.media_url ?? ''}
        loop
        playsInline
        muted={isMuted}
        onClick={handleTap}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectFit: 'cover' }}
      />

      {/* Pause icon */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-5">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 50%, rgba(0,0,0,0.7) 100%)'
        }}
      />

      {/* Right side actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`p-2 rounded-full ${liked ? 'bg-red-500/20' : 'bg-black/30'} backdrop-blur-sm`}>
            <Heart className={`h-6 w-6 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(likesCount)}</span>
        </button>

        {/* Comment */}
        <button className="flex flex-col items-center gap-1">
          <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(post.comments_count)}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
            <Share2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>

        {/* Mute/Unmute */}
        <button onClick={onToggleMute}>
          <div className="p-2 rounded-full bg-black/30 backdrop-blur-sm">
            {isMuted
              ? <VolumeX className="h-6 w-6 text-white" />
              : <Volume2 className="h-6 w-6 text-white" />
            }
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-3 right-20 z-10">
        <Link href={`/profile/${post.profiles.username}`} className="flex items-center gap-2.5 mb-2">
          <Avatar className="h-9 w-9 border-2 border-white/80">
            <AvatarImage src={getAvatarUrl(post.profiles.avatar_url)} />
            <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-pink-500 to-purple-500 text-white">
              {post.profiles.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="text-white font-semibold text-sm drop-shadow">@{post.profiles.username}</span>
            {post.profiles.is_verified && <span className="ml-1 text-cyan-400 text-xs">✓</span>}
          </div>
        </Link>
        {post.content && (
          <p className="text-white text-sm drop-shadow leading-relaxed line-clamp-2 max-w-xs">
            {post.content}
          </p>
        )}
        {/* Audio bar */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-[8px]">♪</span>
          </div>
          <p className="text-white/70 text-xs">Original Audio</p>
        </div>
      </div>
    </div>
  )
}
