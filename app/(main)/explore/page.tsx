'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PostCard } from '@/components/feed/PostCard'
import { PostSkeleton } from '@/components/feed/PostSkeleton'
import { useExplorePosts } from '@/lib/hooks/usePosts'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/helpers'
import Link from 'next/link'
import { Profile } from '@/lib/types/database.types'

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const { user } = useUser()
  const { data: posts = [], isLoading } = useExplorePosts(user?.id)
  const supabase = createClient()

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return []
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(10)
      return data as Profile[]
    },
    enabled: query.length > 1,
  })

  return (
    <div className="max-w-xl mx-auto">
      <div className="sticky top-14 z-10 bg-background p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {query.length > 1 && searchResults.length > 0 && (
        <div className="border-b">
          {searchResults.map((profile) => (
            <Link key={profile.id} href={`/profile/${profile.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
                <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{profile.username}</p>
                {profile.full_name && <p className="text-xs text-muted-foreground">{profile.full_name}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!query && (
        <div>
          <p className="text-xs text-muted-foreground font-semibold px-4 py-3 uppercase tracking-wide">Trending Posts</p>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <PostSkeleton key={i} />)
            : posts.map((post) => <PostCard key={post.id} post={post} />)
          }
        </div>
      )}
    </div>
  )
}
