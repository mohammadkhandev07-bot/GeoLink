'use client'

import { useState, useRef } from 'react'
import { ImageIcon, Film, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { PostCard } from '@/components/feed/PostCard'
import { PostSkeleton } from '@/components/feed/PostSkeleton'
import { AdsterraBanner } from '@/components/shared/AdsterraBanner'
import { useFeedPosts } from '@/lib/hooks/usePosts'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { useQueryClient } from '@tanstack/react-query'

export default function FeedPage() {
  const { user, profile } = useUser()
  const { data: posts = [], isLoading } = useFeedPosts(user?.id)
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'none'>('none')
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const queryClient = useQueryClient()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType('none')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handlePost = async () => {
    if (!user || (!content.trim() && !mediaFile)) return
    setPosting(true)
    try {
      let media_url: string | null = null
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('posts').upload(path, mediaFile)
        if (error) throw error
        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
        media_url = urlData.publicUrl
      }
      await supabase.from('posts').insert({
        user_id: user.id,
        content: content.trim() || null,
        media_url,
        media_type: mediaType,
      })
      await supabase.rpc('increment_posts_count', { profile_id: user.id })
      setContent('')
      clearMedia()
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
    } catch (err) {
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId)
    queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Create Post */}
      {profile && (
        <Card className="m-4 mb-2">
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <Textarea
                placeholder={`What's on your mind, ${profile.full_name || profile.username}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="resize-none min-h-[60px]"
              />
            </div>
            {mediaPreview && (
              <div className="relative rounded-lg overflow-hidden">
                {mediaType === 'image'
                  ? <img src={mediaPreview} alt="Preview" className="w-full max-h-64 object-cover" />
                  : <video src={mediaPreview} controls className="w-full max-h-64" />
                }
                <button onClick={clearMedia} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                  onClick={() => { if (fileRef.current) { fileRef.current.accept = 'image/*'; fileRef.current.click() } }}>
                  <ImageIcon className="h-4 w-4" /> Photo
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                  onClick={() => { if (fileRef.current) { fileRef.current.accept = 'video/*'; fileRef.current.click() } }}>
                  <Film className="h-4 w-4" /> Video
                </Button>
              </div>
              <Button size="sm" variant="gradient" onClick={handlePost}
                disabled={posting || (!content.trim() && !mediaFile)} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                {posting ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed */}
      <div>
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
          : posts.length === 0
          ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg font-medium">Your feed is empty</p>
              <p className="text-sm mt-1">Follow people to see their posts here</p>
            </div>
          )
          : posts.map((post, index) => (
            <div key={post.id}>
              <PostCard post={post} onDelete={handleDeletePost} />
              {/* Native Banner ad after every 4 posts */}
              {(index + 1) % 4 === 0 && (
                <div className="border-y bg-muted/20 py-1">
                  <AdsterraBanner slotKey={`feed_${index}`} />
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  )
}
