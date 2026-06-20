'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Film, MessageCircle, Heart } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'
import { useUser } from '@/lib/hooks/useUser'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarUrl } from '@/lib/utils/helpers'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/liked', icon: Heart, label: 'Liked' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { profile } = useUser()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors',
              pathname.startsWith(href)
                ? 'text-pink-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5', pathname.startsWith(href) && href === '/liked' ? 'fill-pink-500' : '')} />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}

        {/* Profile */}
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className={cn(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors',
              pathname.startsWith('/profile')
                ? 'text-pink-500'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
              <AvatarFallback className="text-[10px]">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-[10px]">Profile</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
