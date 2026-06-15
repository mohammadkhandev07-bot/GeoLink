'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Edit, Search, MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ChatList } from '@/components/chat/ChatList'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useRouter } from 'next/navigation'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { Profile } from '@/lib/types/database.types'

export default function ChatPage() {
  const { user, loading } = useUser()
  const [search, setSearch] = useState('')
  const [showPeople, setShowPeople] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Followers + Following list
  const { data: people = [] } = useQuery({
    queryKey: ['chat-people', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Following list
      const { data: following } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(*)')
        .eq('follower_id', user.id)
        .eq('status', 'accepted')

      // Followers list
      const { data: followers } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(*)')
        .eq('following_id', user.id)
        .eq('status', 'accepted')

      const followingProfiles = (following || []).map((f: any) => f.profiles)
      const followerProfiles = (followers || []).map((f: any) => f.profiles)

      // Merge aur duplicates remove karo
      const all = [...followingProfiles, ...followerProfiles]
      const unique = all.filter((p, index, self) =>
        p && index === self.findIndex((t) => t?.id === p?.id)
      )

      return unique as Profile[]
    },
    enabled: !!user,
  })

  // Search filter
  const filtered = people.filter(p =>
    p?.username?.toLowerCase().includes(search.toLowerCase()) ||
    p?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  // Chat start karo ya existing chat open karo
  const startChat = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) return

      // Check karo existing chat hai
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .or(
          `and(participant1_id.eq.${user.id},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${user.id})`
        )
        .single()

      if (existing) {
        router.push(`/chat/${existing.id}`)
        return
      }

      // Naya chat banao
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          participant1_id: user.id,
          participant2_id: otherUserId,
        })
        .select()
        .single()

      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['chats'] })
      router.push(`/chat/${newChat.id}`)
    },
  })

  if (loading) return <PageLoader />
  if (!user) return null

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="sticky top-14 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <button
          onClick={() => setShowPeople(!showPeople)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit className="h-5 w-5" />
        </button>
      </div>

      {/* New Message - People List */}
      {showPeople && (
        <div className="border-b bg-muted/20">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-muted-foreground mb-3">
              New Message — Followers & Following
            </p>
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search people..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* People list */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {people.length === 0
                    ? 'Follow someone to start chatting!'
                    : 'No results found'}
                </p>
              ) : (
                filtered.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => startChat.mutate(person.id)}
                    disabled={startChat.isPending}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{person.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{person.username}</p>
                      {person.full_name && (
                        <p className="text-xs text-muted-foreground truncate">{person.full_name}</p>
                      )}
                    </div>
                    <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Chats */}
      <ChatList currentUserId={user.id} />
    </div>
  )
}
