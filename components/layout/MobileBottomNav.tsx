'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Film, MessageCircle, User, PlusSquare } from 'lucide-react'
import { cn } from '@/lib/utils/helpers'
import { useUser } from '@/lib/hooks/useUser'

const navItems = [
  { href: '/feed', icon: Home, label: 'Home' },
  { href: '/explore', icon: Compass, label: 'Explore' },
  { href: '/reels', icon: Film, label: 'Reels' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { profile } = useUser()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors',
              pathname.startsWith(href) ? 'text-pink-500' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}

        {/* Create Post button mobile pe */}
        <Link
          href="/feed?create=true"
          className={cn(
            'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors',
            'text-muted-foreground'
          )}
        >
          <PlusSquare className="h-5 w-5" />
          <span className="text-[10px]">Post</span>
        </Link>

        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            className={cn(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors',
              pathname.startsWith('/profile') ? 'text-pink-500' : 'text-muted-foreground'
            )}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px]">Profile</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
