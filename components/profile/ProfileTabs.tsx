'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { Grid3x3, Film, Lock, X, Play, Heart, MessageCircle, Send, MoreVertical, Trash2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { PostWithProfile } from '@/lib/types/database.types'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCount } from '@/lib/utils/helpers'
import { useUser } from '@/lib/hooks/useUser'
import { PostCaption } from '@/components/shared/PostCaption'
import { SaveButton } from '@/components/shared/SaveButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl, formatTimeAgo } from '@/lib/utils/helpers'

interface ProfileTabsProps {
  profileId: string
  isPrivate: boolean
  isFollowing: boolean
  isOwn: boolean
}

export function ProfileTabs({ profileId, isPrivate, isFollowing, isOwn }: ProfileTabsProps) {
  const supabase = createClient()
  const { user } = useUser()
  const canView = !isPrivate || isFollowing || isOwn
  const [selectedPost, setSelectedPost] = useState<PostWithProfile | null>(null)
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [showPostMenu, setShowPostMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useQueryClient()

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['profile-posts', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PostWithProfile[]
    },
    enabled: canView,
  })

  const openPost = async (post: PostWithProfile) => {
    setSelectedPost(post)
    setLikesCount(post.likes_count)
    setComment('')
    setShowPostMenu(false)

    // Check if liked
    if (user) {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setLiked(!!data)
    }

    // Load comments
    setCommentsLoading(true)
    const { data: cmts } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(cmts || [])
    setCommentsLoading(false)
  }

  const handleLike = async () => {
    if (!user || !selectedPost) return
    const newLiked = !liked
    setLiked(newLiked)
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1)
    if (newLiked) {
      await supabase.from('likes').insert({ post_id: selectedPost.id, user_id: user.id })
      await supabase.rpc('increment_likes', { post_id: selectedPost.id })
      if (user.id !== selectedPost.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedPost.user_id, actor_id: user.id, type: 'like', post_id: selectedPost.id,
        })
      }
    } else {
      await supabase.from('likes').delete().eq('post_id', selectedPost.id).eq('user_id', user.id)
      await supabase.rpc('decrement_likes', { post_id: selectedPost.id })
    }
    queryClient.invalidateQueries({ queryKey: ['profile-posts', profileId] })
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPost || !comment.trim()) return
    const { data } = await supabase
      .from('comments')
      .insert({ post_id: selectedPost.id, user_id: user.id, content: comment.trim() })
      .select('*, profiles(*)')
      .single()
    if (data) {
      setComments(prev => [...prev, data])
      await supabase.rpc('increment_comments', { post_id: selectedPost.id })
      if (user.id !== selectedPost.user_id) {
        await supabase.from('notifications').insert({
          user_id: selectedPost.user_id, actor_id: user.id, type: 'comment', message: comment.trim(), post_id: selectedPost.id,
        })
      }
    }
    setComment('')
  }

  const handleDeletePost = async () => {
    if (!selectedPost || !user) return
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeleting(true)
    try {
      // .select() after delete means Supabase actually tells us whether a
      // row was removed - without it, a silently-rejected delete (RLS,
      // network hiccup, whatever) looks identical to a successful one and
      // the post just reappears next time the grid refreshes, with no
      // indication anything went wrong.
      const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', selectedPost.id)
        .eq('user_id', user.id)
        .select('id')

      if (error) {
        alert('Could not delete this post: ' + error.message)
        return
      }
      if (!data || data.length === 0) {
        alert('Could not delete this post. Please try again.')
        return
      }

      setSelectedPost(null)
      setShowPostMenu(false)
      queryClient.invalidateQueries({ queryKey: ['profile-posts', profileId] })
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] })
    } finally {
      setDeleting(false)
    }
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <Lock className="h-12 w-12" />
        <p className="font-semibold">This account is private</p>
        <p className="text-sm">Follow to see their posts</p>
      </div>
    )
  }

  const imagePosts = posts.filter(p => p.media_type === 'image' || !p.media_url)
  const videoPosts = posts.filter(p => p.media_type === 'video')

  return (
    <>
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="w-full rounded-none border-b bg-transparent h-auto">
          <TabsTrigger value="posts" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
            <Grid3x3 className="h-4 w-4" /> Posts
          </TabsTrigger>
          <TabsTrigger value="reels" className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent data-[state=active]:border-foreground">
            <Film className="h-4 w-4" /> Reels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {isLoading ? (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
            </div>
          ) : imagePosts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Grid3x3 className="h-12 w-12 mb-2" /><p>No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {imagePosts.map(post => (
                <button key={post.id} onClick={() => openPost(post)}
                  className="relative aspect-square bg-muted overflow-hidden group">
                  {post.media_url ? (
                    <Image src={post.media_url} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" />
                  ) : (
                    <div className="flex items-center justify-center h-full p-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                      <PostCaption content={post.content ?? ''} variant="titleOnly" titleClassName="text-xs text-center text-muted-foreground line-clamp-4" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-3 text-white text-xs font-semibold">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5 fill-white" />{formatCount(post.likes_count)}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5 fill-white" />{formatCount(post.comments_count)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reels">
          {videoPosts.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Film className="h-12 w-12 mb-2" /><p>No reels yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {videoPosts.map(post => (
                <button key={post.id} onClick={() => openPost(post)}
                  className="relative aspect-[9/16] bg-muted overflow-hidden group">
                  <video src={post.media_url ?? ''} className="w-full h-full object-cover" preload="metadata" muted />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/40 rounded-full p-2">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs">
                    <Heart className="h-3 w-3 fill-white" />{formatCount(post.likes_count)}
                  </div>
                  <Film className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow" />
                </button>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Post/Reel Viewer Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedPost(null)}>
          <button onClick={() => setSelectedPost(null)}
            className="absolute top-4 right-4 z-10 bg-white/20 rounded-full p-2 text-white hover:bg-white/30">
            <X className="h-5 w-5" />
          </button>

          {isOwn && (
            <div className="absolute top-4 right-16 z-10" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowPostMenu(v => !v)}
                className="bg-white/20 rounded-full p-2 text-white hover:bg-white/30">
                <MoreVertical className="h-5 w-5" />
              </button>
              {showPostMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowPostMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-card border rounded-xl shadow-xl overflow-hidden w-44 z-20">
                    <button
                      onClick={handleDeletePost}
                      disabled={deleting}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deleting ? 'Deleting...' : 'Delete post'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row w-full max-w-3xl max-h-[90vh] bg-card rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Media */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[300px]">
              {selectedPost.media_type === 'video' ? (
                <video src={selectedPost.media_url ?? ''} controls autoPlay
                  className="w-full max-h-[60vh] md:max-h-[90vh]" style={{ objectFit: 'contain' }} />
              ) : selectedPost.media_url ? (
                <Image src={selectedPost.media_url} alt="" width={500} height={500}
                  className="w-full object-contain max-h-[60vh] md:max-h-[90vh]" />
              ) : (
                <div className="p-6 w-full">
                  {selectedPost.content && (
                    <PostCaption content={selectedPost.content} forceExpanded titleClassName="text-white text-base" captionClassName="text-white/90 text-sm" buttonClassName="text-white/70 text-xs hover:underline font-medium" />
                  )}
                </div>
              )}
            </div>

            {/* Right panel - like, comment */}
            <div className="w-full md:w-80 flex flex-col bg-card max-h-[90vh]">
              {/* Post info */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{selectedPost.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">@{selectedPost.profiles?.username}</p>
              </div>

              {/* Caption */}
              {selectedPost.content && (
                <div className="px-4 py-3 border-b">
                  <PostCaption content={selectedPost.content} forceExpanded={!selectedPost.media_url} titleClassName="text-sm" captionClassName="text-sm text-muted-foreground" />
                </div>
              )}

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[100px]">
                {commentsLoading ? (
                  <p className="text-xs text-muted-foreground">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={getAvatarUrl(c.profiles?.avatar_url)} />
                        <AvatarFallback className="text-[10px]">{c.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-semibold text-xs">{c.profiles?.username} </span>
                        <span className="text-xs">{c.content}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatTimeAgo(c.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="border-t p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={handleLike} className="flex items-center gap-1.5 text-sm font-semibold">
                    <Heart className={`h-6 w-6 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-foreground'}`} />
                  </button>
                  <span className="text-sm font-semibold">{formatCount(likesCount)} likes</span>
                  <SaveButton postId={selectedPost.id} className="ml-auto text-muted-foreground hover:text-foreground transition-colors" iconClassName="h-5 w-5" />
                </div>

                {/* Comment input */}
                {user && (
                  <form onSubmit={handleComment} className="flex gap-2">
                    <input
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-muted rounded-full px-3 py-1.5 text-sm outline-none border border-transparent focus:border-pink-500 transition-colors"
                    />
                    <button type="submit" disabled={!comment.trim()}
                      className="text-pink-500 disabled:opacity-40 transition-opacity">
                      <Send className="h-5 w-5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
