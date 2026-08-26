'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Volume2, VolumeX, Share2, X, Send, Repeat2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShareModal } from '@/components/shared/ShareModal'
import { PostCaption } from '@/components/shared/PostCaption'
import { SaveButton } from '@/components/shared/SaveButton'
import { PostWithProfile } from '@/lib/types/database.types'
import { formatCount, getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { useIsReposted, useToggleRepost } from '@/lib/hooks/useRepost'

interface ReelCardProps {
  post: PostWithProfile
  isActive: boolean
  isMuted: boolean
  onToggleMute: () => void
}

export function ReelCard({ post, isActive, isMuted, onToggleMute }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const seekBarRef = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState(post.is_liked ?? false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [paused, setPaused] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0) // 0-100
  const [seeking, setSeeking] = useState(false)
  const hasCountedViewRef = useRef(false)
  const { user } = useUser()
  const supabase = createClient()

  const { data: isReposted = false } = useIsReposted(post.id, user?.id)
  const toggleRepost = useToggleRepost()

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive && !showComments && !showShare) {
      // Browsers can block autoplay-with-sound without a prior tap on the
      // page - if that happens, fall back to starting muted rather than
      // The video just not playing at all, and let the mute button take
      // over from there.
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true
          videoRef.current.play().catch(() => {})
        }
      })
      setPaused(false)
      if (!hasCountedViewRef.current) {
        hasCountedViewRef.current = true
        supabase.rpc('increment_post_views', { post_id: post.id }).then(() => {})
      }
    } else {
      videoRef.current.pause()
      // Scrolling away and back should always restart from the beginning,
      // like every other short-video feed - not resume from wherever it
      // was left off.
      videoRef.current.currentTime = 0
      setProgress(0)
      hasCountedViewRef.current = false
    }
  }, [isActive, showComments, showShare, post.id])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted
  }, [isMuted])

  useEffect(() => {
    if (!user) return
    if (post.is_liked !== undefined) { setLiked(post.is_liked); return }
    supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user.id)
      .maybeSingle().then(({ data }) => setLiked(!!data))
  }, [post.id, user?.id])

  const handleTap = () => {
    if (!videoRef.current || showComments || showShare) return
    if (videoRef.current.paused) { videoRef.current.play(); setPaused(false) }
    else { videoRef.current.pause(); setPaused(true) }
  }

  const handleTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !v.duration || seeking) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  const seekFromClientX = (clientX: number) => {
    const bar = seekBarRef.current
    const v = videoRef.current
    if (!bar || !v || !v.duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    v.currentTime = ratio * v.duration
    setProgress(ratio * 100)
  }

  const handleSeekPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    setSeeking(true)
    seekFromClientX(e.clientX)
  }
  const handleSeekPointerMove = (e: React.PointerEvent) => {
    if (!seeking) return
    e.stopPropagation()
    seekFromClientX(e.clientX)
  }
  const handleSeekPointerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    setSeeking(false)
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
  }

  const handleRepost = () => {
    if (!user) return
    toggleRepost.mutate({ postId: post.id, userId: user.id, postOwnerId: post.user_id, repost: !isReposted })
  }

  const openComments = async () => {
    if (!commentsLoaded) {
      const { data } = await supabase.from('comments').select('*, profiles(*)')
        .eq('post_id', post.id).order('created_at', { ascending: true })
      setComments(data || [])
      setCommentsLoaded(true)
    }
    setShowComments(true)
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

  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black snap-start snap-always overflow-hidden">
      {/* Video */}
      <video ref={videoRef} src={post.media_url ?? ''} loop playsInline muted={isMuted}
        onClick={handleTap}
        onTimeUpdate={handleTimeUpdate}
        className="absolute inset-0 w-full h-full object-cover" />

      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-5">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.7) 100%)' }} />

      {/* Seek bar - YouTube-style, drag anywhere along it to jump to that point */}
      <div
        ref={seekBarRef}
        onPointerDown={handleSeekPointerDown}
        onPointerMove={handleSeekPointerMove}
        onPointerUp={handleSeekPointerUp}
        onPointerLeave={handleSeekPointerUp}
        className="absolute bottom-0 left-0 right-0 z-20 h-4 flex items-center touch-none cursor-pointer group/seek"
      >
        <div className="relative w-full h-1 group-hover/seek:h-1.5 bg-white/25 transition-all">
          <div className="absolute inset-y-0 left-0 bg-pink-500" style={{ width: `${progress}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-pink-500 opacity-0 group-hover/seek:opacity-100 transition-opacity"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      {/* Mute - top-left, out of the way of everything else */}
      <button onClick={onToggleMute} className="absolute top-3 left-3 z-20">
        <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
          {isMuted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
        </div>
      </button>

      {/* Right actions - compact so Like never gets pushed off-screen on
          short phone viewports. */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-3.5 z-10">
        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-0.5">
          <div className={`p-1.5 rounded-full backdrop-blur-sm ${liked ? 'bg-red-500/20' : 'bg-black/30'}`}>
            <Heart className={`h-5 w-5 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">{formatCount(likesCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={openComments} className="flex flex-col items-center gap-0.5">
          <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">{formatCount(post.comments_count)}</span>
        </button>

        {/* Share */}
        <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-0.5">
          <div className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">{post.shares_count > 0 ? formatCount(post.shares_count) : 'Share'}</span>
        </button>

        {/* Repost - the arrows spin in place when you repost, on top of
            the icon turning green, instead of just a flat color change. */}
        <button onClick={handleRepost} disabled={toggleRepost.isPending} className="flex flex-col items-center gap-0.5">
          <div className={`p-1.5 rounded-full backdrop-blur-sm ${isReposted ? 'bg-green-500/20' : 'bg-black/30'}`}>
            <Repeat2 className={`h-5 w-5 ${isReposted ? 'text-green-500 animate-repost-spin' : 'text-white'}`} />
          </div>
          <span className="text-white text-[10px] font-semibold drop-shadow">Repost</span>
        </button>

        {/* Save */}
        <SaveButton
          postId={post.id}
          className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm"
          iconClassName="h-5 w-5 text-white"
        />
      </div>

      {/* "X reposted" badge - a small floating avatar with a repost icon
          badge, distinct from the video owner shown at the bottom. */}
      {post.reposted_by && (
        <Link href={`/profile/${post.reposted_by.username}`} className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full pl-1 pr-3 py-1">
          <div className="relative shrink-0">
            <Avatar className="h-6 w-6 animate-repost-in">
              <AvatarImage src={getAvatarUrl(post.reposted_by.avatar_url)} />
              <AvatarFallback className="text-[8px]">{post.reposted_by.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 bg-purple-500 rounded-full p-[3px] border border-black">
              <Repeat2 className="h-2 w-2 text-white" />
            </div>
          </div>
          <span className="text-white text-[11px] font-medium">{post.reposted_by.username} reposted</span>
        </Link>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-6 left-3 right-16 z-10">
        <Link href={`/profile/${post.profiles.username}`} className="flex items-center gap-2.5 mb-2">
          <Avatar className="h-9 w-9 border-2 border-white/80">
            <AvatarImage src={getAvatarUrl(post.profiles.avatar_url)} />
            <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-pink-500 to-purple-500 text-white">
              {post.profiles.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow">@{post.profiles.username}</span>
        </Link>
        {post.content && (
          <PostCaption
            content={post.content}
            forceExpanded={!post.media_url}
            className="max-w-xs"
            titleClassName="text-white text-sm drop-shadow leading-relaxed"
            captionClassName="text-white/90 text-sm drop-shadow leading-relaxed"
            buttonClassName="text-white/70 text-xs hover:underline font-medium drop-shadow"
          />
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-[8px] text-white">♪</span>
          </div>
          <p className="text-white/70 text-xs">Original Audio</p>
        </div>
      </div>

      {/* Comments Panel */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-card/95 backdrop-blur-md rounded-t-2xl"
          style={{ maxHeight: '60%' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-bold text-sm">Comments ({comments.length})</h3>
            <button onClick={() => setShowComments(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 'calc(60vh - 120px)' }}>
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No comments yet!</p>
            ) : comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Link href={`/profile/${c.profiles?.username}`} className="shrink-0">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={getAvatarUrl(c.profiles?.avatar_url)} />
                    <AvatarFallback className="text-[10px]">{c.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <p className="text-sm">
                    <Link href={`/profile/${c.profiles?.username}`} className="font-semibold mr-1 hover:underline">{c.profiles?.username}</Link>
                    {c.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{formatTimeAgo(c.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
          {user && (
            <form onSubmit={handleComment} className="flex gap-2 px-4 py-3 border-t">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-muted rounded-full px-3 py-2 text-sm outline-none border border-transparent focus:border-pink-500" />
              <button type="submit" disabled={!newComment.trim() || submitting} className="text-pink-500 disabled:opacity-40">
                <Send className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShare && <ShareModal post={post} onClose={() => setShowShare(false)} />}
    </div>
  )
}
