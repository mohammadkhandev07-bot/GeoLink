'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'
import { useDeleteStory } from '@/lib/hooks/useStories'
import type { StoryGroup } from '@/lib/hooks/useStories'

interface StoryViewerProps {
  groups: StoryGroup[]
  startGroupIndex: number
  currentUserId?: string
  onClose: () => void
}

const TEXT_PHOTO_DURATION_MS = 5000

const BG_CLASS: Record<string, string> = {
  'pink-purple': 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500',
  'orange-red': 'bg-gradient-to-br from-orange-400 via-red-500 to-pink-600',
  'blue-cyan': 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400',
  'green-lime': 'bg-gradient-to-br from-emerald-500 via-green-500 to-lime-400',
  'dark-slate': 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900',
  'violet-fuchsia': 'bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500',
}

export function StoryViewer({ groups, startGroupIndex, currentUserId, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const deleteStory = useDeleteStory()

  const group = groups[groupIndex]
  const story = group?.stories[storyIndex]

  const goNextStory = () => {
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1)
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1)
      setStoryIndex(0)
    } else {
      onClose()
    }
  }

  const goPrevStory = () => {
    if (!group) return
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1)
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1]
      setGroupIndex((g) => g - 1)
      setStoryIndex(prevGroup.stories.length - 1)
    }
  }

  // Progress + auto-advance timer for text/photo stories.
  useEffect(() => {
    setProgress(0)
    if (timerRef.current) clearInterval(timerRef.current)
    if (!story || story.story_type === 'video') return

    const start = Date.now()
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / TEXT_PHOTO_DURATION_MS) * 100)
      setProgress(pct)
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current)
        goNextStory()
      }
    }, 50)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex])

  // Progress for video stories, driven by actual playback Time.
  useEffect(() => {
    if (!story || story.story_type !== 'video') return
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      if (video.duration) setProgress((video.currentTime / video.duration) * 100)
    }
    const onEnded = () => goNextStory()

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex])

  if (!group || !story) return null

  const isOwn = currentUserId === story.user_id

  const handleDelete = async () => {
    await deleteStory.mutateAsync({ storyId: story.id, mediaUrl: story.media_url })
    if (group.stories.length <= 1) {
      onClose()
    } else {
      goNextStory()
    }
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      <div className="relative w-full h-full sm:max-w-sm sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
                  transition: i === storyIndex ? 'width 50ms linear' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-5 left-2 right-2 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 border border-white/30">
              <AvatarImage src={getAvatarUrl(group.profile?.avatar_url)} />
              <AvatarFallback>{group.profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-medium leading-none">{group.profile?.username}</p>
              <p className="text-white/60 text-xs mt-0.5">{formatTimeAgo(story.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOwn && (
              <button onClick={handleDelete} className="text-white/80 hover:text-white">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative w-full h-full flex items-center justify-center">
          {story.story_type === 'text' && (
            <div className={`w-full h-full flex items-center justify-center p-8 ${BG_CLASS[story.background_color || ''] || BG_CLASS['pink-purple']}`}>
              <p className="text-white text-center text-2xl font-semibold break-words">{story.text_content}</p>
            </div>
          )}

          {story.story_type === 'photo' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.media_url || ''} alt="Story" className="max-w-full max-h-full object-contain" />
          )}

          {story.story_type === 'video' && (
            <video
              ref={videoRef}
              src={story.media_url || ''}
              className="max-w-full max-h-full object-contain"
              autoPlay
              playsInline
              muted={false}
            />
          )}

          {story.overlay_text && story.story_type !== 'text' && (
            <div
              style={{ left: `${story.overlay_x}%`, top: `${story.overlay_y}%`, transform: 'translate(-50%, -50%)' }}
              className="absolute max-w-[85%] text-center px-2"
            >
              <p className="text-white text-xl font-bold break-words" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                {story.overlay_text}
              </p>
            </div>
          )}
        </div>

        {/* Tap zones for prev/next */}
        <button onClick={goPrevStory} className="absolute left-0 top-0 h-full w-1/3 z-10" aria-label="Previous story" />
        <button onClick={goNextStory} className="absolute right-0 top-0 h-full w-2/3 z-10" aria-label="Next story" />
      </div>
    </div>
  )
}
