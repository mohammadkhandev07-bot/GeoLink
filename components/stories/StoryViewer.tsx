'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Music } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'
import { useDeleteStory } from '@/lib/hooks/useStories'
import type { StoryGroup } from '@/lib/hooks/useStories'
import { loadGoogleFont } from '@/lib/utils/googleFonts'
import { resolveBackgroundCss, getTextFillStyle } from '@/lib/utils/storyStyle'
import type { TextScene } from '@/lib/types/database.types'

interface StoryViewerProps {
  groups: StoryGroup[]
  startGroupIndex: number
  currentUserId?: string
  onClose: () => void
}

// Figures out which scene should be showing right now, given how far into
// the story's total duration we are - mirrors how the timeline strip laid
// scenes out one after another in the composer.
function getActiveScene(scenes: TextScene[] | null, elapsedSeconds: number): TextScene | null {
  if (!scenes || scenes.length === 0) return null
  let cursor = 0
  for (const scene of scenes) {
    cursor += scene.duration
    if (elapsedSeconds < cursor) return scene
  }
  return scenes[scenes.length - 1]
}

export function StoryViewer({ groups, startGroupIndex, currentUserId, onClose }: StoryViewerProps) {
  const [groupIndex, setGroupIndex] = useState(startGroupIndex)
  const [storyIndex, setStoryIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const loopCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    const durationMs = (story.duration_seconds || 5) * 1000
    timerRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / durationMs) * 100)
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

  if (!group || !story) return null

  const isOwn = currentUserId === story.user_id

  // For multi-scene text stories, figure out which scene should be showing
  // right now, and pull that scene's own background/text style/position/
  // size/music from it. Falls back to the story's top-level fields for
  // photo/video stories, or text stories that only ever had one scene.
  const totalDuration = story.duration_seconds || 5
  const elapsedSeconds = (progress / 100) * totalDuration
  const activeScene = story.story_type === 'text' ? getActiveScene(story.text_scenes, elapsedSeconds) : null

  const displayText = activeScene ? activeScene.text : story.text_content
  const displayBackground = activeScene ? activeScene.backgroundColor : story.background_color
  const displayTextColor = activeScene ? activeScene.textColor : story.text_color
  const displayFont = activeScene ? activeScene.fontFamily : story.font_family
  const displayTextX = activeScene?.textX ?? 50
  const displayTextY = activeScene?.textY ?? 50
  const displayTextSize = activeScene?.textSize ?? 32

  const activeMusicUrl = activeScene ? activeScene.musicUrl : story.music_url
  const activeMusicTitle = activeScene ? activeScene.musicTitle : story.music_title
  const activeMusicArtist = activeScene ? activeScene.musicArtist : story.music_artist
  const activeMusicArtwork = activeScene ? activeScene.musicArtworkUrl : story.music_artwork_url
  const musicStart = activeScene?.musicStart ?? 0
  const musicClipDuration = activeScene?.musicDuration

  // Load whichever font this particular scene/story needs (only fetched
  // once per font, cached after that - see loadGoogleFont).
  const activeFont = story.story_type === 'text' ? displayFont : story.overlay_font_family
  if (activeFont) loadGoogleFont(activeFont)

  // Play whichever song is active right now. Re-runs when the active
  // scene's music changes (a new scene with a different/no song took over).
  useEffect(() => {
    audioRef.current?.pause()
    audioRef.current = null
    if (loopCheckRef.current) clearInterval(loopCheckRef.current)

    if (!activeMusicUrl) return

    const audio = new Audio(activeMusicUrl)
    audio.currentTime = musicStart
    audio.play().catch(() => {
      // Autoplay can be blocked in some browsers - not critical, the story
      // still plays fine without sound in that edge case.
    })
    audioRef.current = audio

    // If a trimmed clip is shorter than however long this scene/story stays
    // on screen, loop just that trimmed window instead of the whole preview.
    if (musicClipDuration) {
      loopCheckRef.current = setInterval(() => {
        if (audio.currentTime >= musicStart + musicClipDuration) {
          audio.currentTime = musicStart
        }
      }, 200)
    } else if (story.story_type !== 'video') {
      audio.loop = true
    }

    return () => {
      audio.pause()
      if (loopCheckRef.current) clearInterval(loopCheckRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, activeMusicUrl, activeScene?.id])

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
              className="w-full h-full relative"
              style={{ background: resolveBackgroundCss(displayBackground) }}
            >
              <p
                style={{
                  position: 'absolute',
                  left: `${displayTextX}%`,
                  top: `${displayTextY}%`,
                  transform: 'translate(-50%, -50%)',
                  ...getTextFillStyle(displayTextColor),
                  fontFamily: displayFont ? `'${displayFont}', sans-serif` : undefined,
                  fontSize: `${displayTextSize}px`,
                }}
                className="text-center font-semibold break-words max-w-[85%]"
              >
                {displayText}
              </p>
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
              <p
                className="text-xl font-bold break-words"
                style={{
                  ...getTextFillStyle(story.overlay_text_color),
                  textShadow: story.overlay_text_color?.startsWith('gradient:') ? undefined : '0 1px 6px rgba(0,0,0,0.6)',
                  fontFamily: story.overlay_font_family ? `'${story.overlay_font_family}', sans-serif` : undefined,
                }}
              >
                {story.overlay_text}
              </p>
            </div>
          )}

          {activeMusicTitle && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pl-1.5 pr-4 py-1.5 max-w-[85%] z-10">
              {activeMusicArtwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeMusicArtwork} alt={activeMusicTitle} className="h-7 w-7 rounded-full object-cover shrink-0" />
              ) : (
                <Music className="h-4 w-4 text-white shrink-0" />
              )}
              <span className="text-white text-xs font-medium truncate">
                {activeMusicTitle}{activeMusicArtist ? ` \u00b7 ${activeMusicArtist}` : ''}
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
