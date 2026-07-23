'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Music } from 'lucide-react'
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
const DEFAULT_BACKGROUND = 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)'

export function StoryViewer({ groups, startGroupIndex, currentUserId, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
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

  // Progress for video stories, driven by actual playback time.
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

  // Play the story's chosen song, if it has one. Loops for text/photo
  // stories (which have a fixed short display time), plays once for videos.
  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null

    if (!story?.music_url) return

    const audio = new Audio(story.music_url)
    audio.loop = story.story_type !== 'video'
    audio.play().catch(() => {
      // Autoplay can be blocked in some browsers - not critical, the story
      // still plays fine without sound in that edge case.
    })
    audioRef.current = audio

    return () => { audio.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, story?.music_url])

  if (!group || !story) return null

  const isOwn = currentUserId === story.user_id

  const handleDelete = async () => {
    audioRef.current?.pause()
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
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: story.background_color || DEFAULT_BACKGROUND }}
            >
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
              // If a song was picked, the video's own sound is muted so the
              // chosen song plays instead - same as Instagram/Reels behavior.
              muted={!!story.music_url}
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

          {story.music_title && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pl-1.5 pr-4 py-1.5 max-w-[85%] z-10">
              {story.music_artwork_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.music_artwork_url} alt={story.music_title} className="h-7 w-7 rounded-full object-cover shrink-0" />
              ) : (
                <Music className="h-4 w-4 text-white shrink-0" />
              )}
              <span className="text-white text-xs font-medium truncate">
                {story.music_title}{story.music_artist ? ` \u00b7 ${story.music_artist}` : ''}
              </span>
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
