'use client'

import { useState, useEffect } from 'react'
import { X, Send, Search, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { PostWithProfile } from '@/lib/types/database.types'

interface ShareModalProps {
  post: PostWithProfile
  onClose: () => void
}

interface Follower {
  id: string
  username: string
  avatar_url: string | null
  full_name: string | null
}

export function ShareModal({ post, onClose }: ShareModalProps) {
  const { user } = useUser()
  const [followers, setFollowers] = useState<Follower[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!user) return
      const { data } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(id, username, avatar_url, full_name)')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')
      const list = (data || []).map((d: any) => d.profiles).filter(Boolean)

      const { data: data2 } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(id, username, avatar_url, full_name)')
        .eq('following_id', user.id)
        .eq('status', 'accepted')
      const list2 = (data2 || []).map((d: any) => d.profiles).filter(Boolean)

      // Merge unique
      const merged = [...list, ...list2.filter((p: Follower) => !list.find((l: Follower) => l.id === p.id))]
      setFollowers(merged)
    }
    fetchFollowers()
  }, [user])

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleSend = async () => {
    if (!user || selected.length === 0) return
    setSending(true)

    for (const receiverId of selected) {
      // Find or create chat
      let chatId: string | null = null

      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${receiverId}),and(participant1_id.eq.${receiverId},participant2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingChat) {
        chatId = existingChat.id
      } else {
        const { data: newChat } = await supabase
          .from('chats')
          .insert({ participant1_id: user.id, participant2_id: receiverId })
          .select('id').single()
        chatId = newChat?.id || null
      }

      if (!chatId) continue

      // Send message with post link
      const postUrl = `${window.location.origin}/feed`
      const shareText = `🔗 Shared a post: ${post.content?.slice(0, 50) || 'Check this out!'}`

      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: shareText,
        post_id: post.id,
      })

      // Notification
      await supabase.from('notifications').insert({
        user_id: receiverId,
        actor_id: user.id,
        type: 'message',
        message: shareText,
      })
    }

    setSent(true)
    setSending(false)
    setTimeout(onClose, 1500)
  }

  const filtered = followers.filter(f =>
    f.username.toLowerCase().includes(search.toLowerCase()) ||
    (f.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-card border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-base">Share Post</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Post preview */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={getAvatarUrl(post.profiles?.avatar_url)} />
              <AvatarFallback>{post.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold">{post.profiles?.username}</p>
              {post.content && <p className="text-xs text-muted-foreground line-clamp-1">{post.content.slice(0, 60)}</p>}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full bg-muted rounded-full pl-8 pr-3 py-1.5 text-sm outline-none"
            />
          </div>
        </div>

        {/* People list */}
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No followers/following to share with
            </div>
          ) : (
            filtered.map(person => (
              <button
                key={person.id}
                onClick={() => toggleSelect(person.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={getAvatarUrl(person.avatar_url)} />
                  <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{person.username}</p>
                  {person.full_name && <p className="text-xs text-muted-foreground truncate">{person.full_name}</p>}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  selected.includes(person.id)
                    ? 'bg-pink-500 border-pink-500'
                    : 'border-muted-foreground'
                }`}>
                  {selected.includes(person.id) && <Check className="h-3 w-3 text-white" />}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Send button */}
        <div className="p-4 border-t">
          {sent ? (
            <div className="w-full py-3 bg-green-500 text-white rounded-xl text-center font-semibold">
              ✓ Sent!
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={selected.length === 0 || sending}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
            >
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : `Send${selected.length > 0 ? ` (${selected.length})` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
