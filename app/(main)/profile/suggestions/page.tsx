'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/hooks/useUser'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { FollowButton } from '@/components/profile/FollowButton'
import { Profile } from '@/lib/types/database.types'

export default function SuggestionsPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['suggestions', user?.id],
    queryFn: async () => {
      const { data: alreadyFollowing } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id ?? '')

      const excludeIds = new Set((alreadyFollowing || []).map(f => f.following_id))
      excludeIds.add(user?.id ?? '')

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_private', false)
        .eq('search_privacy', 'everyone')
        .order('created_at', { ascending: false })
        .limit(50)

      return ((data as Profile[]) || []).filter(p => !excludeIds.has(p.id)).slice(0, 30)
    },
    enabled: !!user,
  })

  if (loading) return <PageLoader />
  if (!user) return null

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-14 z-10 bg-background border-b flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg">Suggestions for you</h1>
          <p className="text-xs text-muted-foreground">People you might want to follow</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-pink-500/50" />
          </div>
          <p className="font-semibold text-foreground">No suggestions right now</p>
          <p className="text-sm max-w-xs">Check back later for people to follow.</p>
        </div>
      ) : (
        <div className="divide-y">
          {suggestions.map(profile => (
            <div key={profile.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/profile/${profile.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold">
                    {profile.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{profile.username}</p>
                  {profile.full_name && <p className="text-xs text-muted-foreground truncate">{profile.full_name}</p>}
                </div>
              </Link>
              <FollowButton
                targetUserId={profile.id}
                targetUsername={profile.username}
                isPrivate={profile.is_private}
                currentUserId={user.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
