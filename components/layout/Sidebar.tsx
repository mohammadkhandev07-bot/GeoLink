'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Film, MessageCircle, Settings, PlusSquare, Heart } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'
import { useUser } from '@/lib/hooks/useUser'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/helpers'
import { AdsterraBanner } from '@/components/shared/AdsterraBanner'
import { CreatePostModal } from '@/components/shared/CreatePostModal'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '/chat', icon: MessageCircle, label: 'Messages' },
  { href: '/liked', icon: Heart, label: 'Liked Videos' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile } = useUser()
  const [showCreate, setShowCreate] = useState(false)

  return (
    <>
      <aside className="hidden lg:flex flex-col w-60 xl:w-72 border-r bg-background h-[calc(100vh-3.5rem)] sticky top-14 overflow-y-auto p-4 gap-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
              pathname.startsWith(href) && 'bg-accent text-accent-foreground')}>
            <Icon className={cn('h-5 w-5', pathname.startsWith(href) && href === '/liked' ? 'fill-pink-500 text-pink-500' : '')} />
            {label}
          </Link>
        ))}

        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent text-left w-full"
        >
          <PlusSquare className="h-5 w-5" />
          Create Post
        </button>

        <div className="mt-auto pt-4 border-t space-y-1">
          {profile && (
            <Link href={`/profile/${profile.username}`}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
                pathname.startsWith('/profile') && 'bg-accent')}>
              <Avatar className="h-6 w-6">
                <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
                <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span>{profile.username}</span>
            </Link>
          )}
          <Link href="/settings"
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-accent',
              pathname.startsWith('/settings') && 'bg-accent')}>
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </div>

        <div className="mt-4">
          <AdsterraBanner slotKey="sidebar_slot" />
        </div>
      </aside>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
