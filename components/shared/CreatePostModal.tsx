'use client'

import { useState, useRef } from 'react'
import { X, ImageIcon, Film, ArrowLeft, Hash, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'

interface CreatePostModalProps {
  onClose: () => void
}

// Curated GeoLink hashtag suggestions - shown as autocomplete while typing
const SUGGESTED_HASHTAGS = [
  'geolink', 'reels', 'trending', 'viral', 'explore', 'photography',
  'travel', 'foodie', 'fashion', 'nature', 'love', 'instagood',
  'fitness', 'art', 'music', 'throwback', 'selfie', 'friends',
  'memories', 'life', 'sunset', 'ootd', 'motivation', 'reelsindia',
  'reelitfeelit', 'explorepage', 'geolinkers',
]

// Finds the hashtag "word" the cursor is currently inside of, e.g.
// typing "hello #re|els world" (| = cursor) returns { word: '#re', start: 6, end: 9 }
function getActiveHashtagWord(value: string, cursorPos: number) {
  const before = value.slice(0, cursorPos)
  const hashIndex = before.lastIndexOf('#')
  if (hashIndex === -1) return null
  // If there's whitespace between the last # and the cursor, we're not in a tag anymore
  const between = before.slice(hashIndex + 1)
  if (/\s/.test(between)) return null
  // Extend to the end of the word (in case cursor isn't at the very end of it)
  const afterMatch = value.slice(cursorPos).match(/^[\w\u0600-\u06FF]*/)
  const end = cursorPos + (afterMatch ? afterMatch[0].length : 0)
  return { word: value.slice(hashIndex, end), start: hashIndex, end }
}

export function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { user, profile } = useUser()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'select' | 'details'>('select')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const hashtagInputRef = useRef<HTMLInputElement>(null)
  const [hashtagSuggestions, setHashtagSuggestions] = useState<string[]>([])
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    setMediaPreview(URL.createObjectURL(file))
    setStep('details')
  }

  const handleTextOnly = () => {
    setMediaType('none')
    setMediaPreview(null)
    setMediaFile(null)
    setStep('details')
  }

  const handleHashtagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHashtags(value)

    const cursorPos = e.target.selectionStart ?? value.length
    const active = getActiveHashtagWord(value, cursorPos)
    // Prefix after the # - only start suggesting once the person has typed
    // at least 2 characters, so e.g. "#re" is needed before "#reels" shows up
    // (matches the "type before it suggests" behavior asked for, YouTube-style)
    const prefix = active ? active.word.slice(1).toLowerCase() : ''

    if (active && prefix.length >= 2) {
      const matches = SUGGESTED_HASHTAGS.filter(tag => tag.toLowerCase().startsWith(prefix)).slice(0, 5)
      setHashtagSuggestions(matches)
      setShowHashtagSuggestions(matches.length > 0)
    } else {
      setHashtagSuggestions([])
      setShowHashtagSuggestions(false)
    }
  }

  const handleSelectHashtagSuggestion = (tag: string) => {
    const input = hashtagInputRef.current
    const cursorPos = input?.selectionStart ?? hashtags.length
    const active = getActiveHashtagWord(hashtags, cursorPos)
    if (!active) return

    const before = hashtags.slice(0, active.start)
    const after = hashtags.slice(active.end)
    const needsSpace = after.length > 0 && !after.startsWith(' ')
    const newValue = `${before}#${tag}${needsSpace ? ' ' : ''}${after}`
    setHashtags(newValue)
    setHashtagSuggestions([])
    setShowHashtagSuggestions(false)

    // Put the cursor right after the inserted tag
    requestAnimationFrame(() => {
      const newCursorPos = before.length + tag.length + 1
      input?.focus()
      input?.setSelectionRange(newCursorPos, newCursorPos)
    })
  }

  const buildContent = () => {
    const parts = []
    if (title.trim()) parts.push(`**${title.trim()}**`)
    if (description.trim()) parts.push(description.trim())
    if (hashtags.trim()) {
      const tags = hashtags.trim().split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).join(' ')
      parts.push(tags)
    }
    return parts.join('\n\n')
  }

  const handlePost = async () => {
    if (!user) return
    setPosting(true)
    setUploadProgress(0)

    try {
      let media_url: string | null = null
      if (mediaFile) {
        setUploadProgress(30)
        const ext = mediaFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('posts').upload(path, mediaFile)
        if (error) throw error
        setUploadProgress(80)
        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
        media_url = urlData.publicUrl
      }

      const content = buildContent()
      setUploadProgress(90)

      await supabase.from('posts').insert({
        user_id: user.id,
        content: content || null,
        media_url,
        media_type: mediaType,
      })
      await supabase.rpc('increment_posts_count', { profile_id: user.id })
      setUploadProgress(100)

      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
      queryClient.invalidateQueries({ queryKey: ['reels-posts'] })
      queryClient.invalidateQueries({ queryKey: ['explore-posts'] })
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] })

      onClose()
    } catch (err) {
      console.error(err)
      alert('Upload failed. Please try again.')
    } finally {
      setPosting(false)
      setUploadProgress(0)
    }
  }

  const renderContent = (content: string) => {
    return content.split('\n\n').map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <span key={i} className="font-bold">{part.slice(2, -2)}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-card border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          {step === 'details' ? (
            <button onClick={() => { if (!mediaFile) setStep('select'); else setStep('details') }}
              className="text-muted-foreground hover:text-foreground">
              {mediaFile ? <ArrowLeft className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <h2 className="font-bold text-base">
            {step === 'select' ? 'Create Post' : 'Add Details'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Select Media */}
        {step === 'select' && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center">What would you like to share?</p>

            <div className="grid grid-cols-1 gap-3">
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

              <button onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() } }}
                className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-pink-500/40 hover:border-pink-500 hover:bg-pink-500/5 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <ImageIcon className="h-6 w-6 text-pink-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Photo Post</p>
                  <p className="text-xs text-muted-foreground">Share a photo with caption & hashtags</p>
                </div>
              </button>

              <button onClick={() => { if (fileRef.current) { fileRef.current.accept = 'video/*'; fileRef.current.click() } }}
                className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-500 hover:bg-purple-500/5 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Film className="h-6 w-6 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Reel / Video</p>
                  <p className="text-xs text-muted-foreground">Upload a video reel with title & description</p>
                </div>
              </button>

              <button onClick={handleTextOnly}
                className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <FileText className="h-6 w-6 text-cyan-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Text Post</p>
                  <p className="text-xs text-muted-foreground">Share thoughts, quotes or updates</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Add Details */}
        {step === 'details' && (
          <div className="max-h-[80vh] overflow-y-auto">
            {/* Preview */}
            {mediaPreview && (
              <div className="relative bg-black" style={{ maxHeight: '280px' }}>
                {mediaType === 'video' ? (
                  <video src={mediaPreview} controls className="w-full" style={{ maxHeight: '280px', objectFit: 'contain' }} />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full object-contain" style={{ maxHeight: '280px' }} />
                )}
                <button onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType('none') }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5 text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="p-4 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarUrl(profile?.avatar_url || null)} />
                  <AvatarFallback>{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{profile?.username}</p>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Title {mediaType === 'video' ? '(Reel Title)' : '(Optional)'}
                </label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={mediaType === 'video' ? 'Give your reel a title...' : 'Add a title...'}
                  className="mt-1.5"
                  maxLength={100}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{title.length}/100</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description / Caption
                </label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Write a caption or description..."
                  className="mt-1.5 resize-none"
                  rows={3}
                  maxLength={2200}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{description.length}/2200</p>
              </div>

              {/* Hashtags */}
              <div className="relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Hashtags
                </label>
                <Input
                  ref={hashtagInputRef}
                  value={hashtags}
                  onChange={handleHashtagsChange}
                  onBlur={() => setTimeout(() => setShowHashtagSuggestions(false), 150)}
                  onFocus={() => { if (hashtagSuggestions.length > 0) setShowHashtagSuggestions(true) }}
                  placeholder="#geolink #trending #viral"
                  className="mt-1.5"
                  autoComplete="off"
                />
                {showHashtagSuggestions && hashtagSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-card border rounded-xl shadow-lg overflow-hidden">
                    {hashtagSuggestions.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleSelectHashtagSuggestion(tag)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <Hash className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                        <span className="font-medium">{tag}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Add hashtags separated by spaces</p>
              </div>

              {/* Preview */}
              {(title || description || hashtags) && (
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Preview:</p>
                  <div className="text-sm space-y-1">
                    {title && <p className="font-bold">{title}</p>}
                    {description && <p className="text-muted-foreground">{description}</p>}
                    {hashtags && (
                      <p className="text-pink-500 text-xs">
                        {hashtags.split(/\s+/).map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Upload progress */}
              {posting && uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Post button */}
              <Button
                onClick={handlePost}
                variant="gradient"
                className="w-full"
                disabled={posting || (!mediaFile && !description.trim() && !title.trim())}
              >
                {posting ? `Posting... ${uploadProgress}%` : mediaType === 'video' ? '🎬 Share Reel' : mediaType === 'image' ? '📸 Share Post' : '✍️ Share'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
