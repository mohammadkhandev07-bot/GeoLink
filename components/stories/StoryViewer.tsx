'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Trash2, Music } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'
import { useDeleteStory } from '@/lib/hooks/useStories'
import type { StoryGroup } from '@/lib/hooks/useStories'
import { loadGoogleFont } from '@/lib/utils/googleFonts'
import { resolveBackgroundCss, getTextFillStyle } from '@/lib/utils/storyStyle'
import type { TextScene, PhotoScene, VideoScene } from '@/lib/types/database.types'

interface StoryViewerProps {
  groups: StoryGroup[]
  startGroupIndex: number
  currentUserId?: string
  onClose: () => void
}

// Figures out which scene should be showing right now, given how far into
// the story's total duration we are - mirrors how the timeline strip laid
// scenes out one after another in the composer. Works for either text or
// photo scenes since both just need { duration }.
function getActiveScene<T extends { duration: number }>(scenes: T[] | null, elapsedSeconds: number): T | null {
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
  const [videoSceneIndex, setVideoSceneIndex] = useState(0)
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

  // Progress for video stories, driven by actual playback time. Advances
  // through each clip in a multi-scene video story before moving on to the
  // next story post.
  useEffect(() => {
    setVideoSceneIndex(0)
  }, [groupIndex, storyIndex])

  useEffect(() => {
    if (!story || story.story_type !== 'video') return
    const video = videoRef.current
    if (!video) return

    const scenes = story.video_scenes
    const priorDuration = scenes ? scenes.slice(0, videoSceneIndex).reduce((s, x) => s + x.duration, 0) : 0

    const onTimeUpdate = () => {
      const total = story.duration_seconds || video.duration || 1
      setProgress(Math.min(100, ((priorDuration + video.currentTime) / total) * 100))
    }
    const onEnded = () => {
      if (scenes && videoSceneIndex < scenes.length - 1) {
        setVideoSceneIndex((i) => i + 1)
      } else {
        goNextStory()
      }
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', onEnded)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', onEnded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, videoSceneIndex])

  if (!group || !story) return null

  const isOwn = currentUserId === story.user_id

  // For multi-scene stories, figure out which scene should be showing right
  // now, and pull that scene's own style/position/music from it. Falls
  // back to the story's top-level fields for single-scene or legacy posts.
  const totalDuration = story.duration_seconds || 5
  const elapsedSeconds = (progress / 100) * totalDuration
  const activeScene = story.story_type === 'text' ? getActiveScene<TextScene>(story.text_scenes, elapsedSeconds) : null
  const activePhotoScene = story.story_type === 'photo' ? getActiveScene<PhotoScene>(story.photo_scenes, elapsedSeconds) : null
  const activeVideoScene: VideoScene | null = story.story_type === 'video' && story.video_scenes ? (story.video_scenes[videoSceneIndex] ?? null) : null

  const displayText = activeScene ? activeScene.text : story.text_content
  const displayBackground = activeScene ? activeScene.backgroundColor : story.background_color
  const displayTextColor = activeScene ? activeScene.textColor : story.text_color
  const displayFont = activeScene ? (activeScene.fontFamily || story.global_font_family) : story.font_family
  const displayTextX = activeScene?.textX ?? 50
  const displayTextY = activeScene?.textY ?? 50
  const displayTextSize = activeScene?.textSize ?? 32

  const displayImageUrl = activePhotoScene ? activePhotoScene.imageUrl : story.media_url
  const displayVideoUrl = activeVideoScene ? activeVideoScene.videoUrl : story.media_url
  const displayOverlayText = activePhotoScene ? activePhotoScene.overlayText : (activeVideoScene ? activeVideoScene.overlayText : story.overlay_text)
  const displayOverlayColor = activePhotoScene ? activePhotoScene.overlayTextColor : story.overlay_text_color
  const displayOverlayFont = activePhotoScene
    ? (activePhotoScene.overlayFontFamily || story.global_font_family)
    : activeVideoScene
      ? (activeVideoScene.overlayFontFamily || story.global_font_family)
      : story.overlay_font_family
  const displayOverlayX = activePhotoScene?.overlayX ?? activeVideoScene?.overlayX ?? story.overlay_x
  const displayOverlayY = activePhotoScene?.overlayY ?? activeVideoScene?.overlayY ?? story.overlay_y

  const sceneMusicUrl = activeScene?.musicUrl || activePhotoScene?.musicUrl || activeVideoScene?.musicUrl
  const activeMusicUrl = sceneMusicUrl || (story.story_type !== 'video' ? story.global_music?.url : undefined) || story.music_url || null
  const musicSource = sceneMusicUrl
    ? {
        title: activeScene?.musicTitle ?? activePhotoScene?.musicTitle ?? activeVideoScene?.musicTitle,
        artist: activeScene?.musicArtist ?? activePhotoScene?.musicArtist ?? activeVideoScene?.musicArtist,
        artwork: activeScene?.musicArtworkUrl ?? activePhotoScene?.musicArtworkUrl ?? activeVideoScene?.musicArtworkUrl,
        start: (activeScene?.musicStart ?? activePhotoScene?.musicStart ?? activeVideoScene?.musicStart) ?? 0,
        clipDuration: activeScene?.musicDuration ?? activePhotoScene?.musicDuration ?? activeVideoScene?.musicDuration,
      }
    : story.global_music
      ? { title: story.global_music.title, artist: story.global_music.artist, artwork: story.global_music.artworkUrl, start: story.global_music.start, clipDuration: story.global_music.duration }
      : { title: story.music_title, artist: story.music_artist, artwork: story.music_artwork_url, start: 0, clipDuration: undefined }
  const activeMusicTitle = musicSource.title
  const activeMusicArtist = musicSource.artist
  const activeMusicArtwork = musicSource.artwork
  const musicStart = musicSource.start
  const musicClipDuration = musicSource.clipDuration

  // Load whichever font this particular scene/story needs (only fetched
  // once per font, cached after that - see loadGoogleFont).
  const activeFont = story.story_type === 'text' ? displayFont : (story.story_type === 'photo' || story.story_type === 'video' ? displayOverlayFont : story.overlay_font_family)
  if (activeFont) loadGoogleFont(activeFont)

  // Play whichever song is active right now. Deliberately keyed on the
  // resolved music URL (not the scene id) - as long as consecutive scenes
  // keep resolving to the SAME song (the shared global one), this effect
  // won't re-run and the audio just keeps playing straight through instead
  // of restarting at every scene change. It only restarts when the song
  // actually changes (a scene's own separate song taking over, or back).
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
  }, [groupIndex, storyIndex, activeMusicUrl])

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
            <img src={displayImageUrl || ''} alt="Story" className="max-w-full max-h-full object-contain" />
          )}

          {story.story_type === 'video' && (
            <video
              key={activeVideoScene?.id || story.id}
              ref={videoRef}
              src={displayVideoUrl || ''}
              className="max-w-full max-h-full object-contain"
              autoPlay
              playsInline
              // If a song was picked, the clip's own sound is muted so the
              // chosen song plays instead - same as Instagram/Reels behavior.
              muted={!!activeMusicUrl}
            />
          )}

          {displayOverlayText && story.story_type !== 'text' && (
            <div
              style={{ left: `${displayOverlayX}%`, top: `${displayOverlayY}%`, transform: 'translate(-50%, -50%)' }}
              className="absolute max-w-[85%] text-center px-2"
            >
              <p
                className="text-xl font-bold break-words"
                style={{
                  ...getTextFillStyle(displayOverlayColor),
                  textShadow: displayOverlayColor?.startsWith('gradient:') ? undefined : '0 1px 6px rgba(0,0,0,0.6)',
                  fontFamily: displayOverlayFont ? `'${displayOverlayFont}', sans-serif` : undefined,
                }}
              >
                {displayOverlayText}
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
