'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { MobileBottomNav } from './MobileBottomNav'
import { CallProvider } from '@/components/call/CallProvider'
import { GlobalToast } from '@/components/shared/GlobalToast'

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // On phones only, an open conversation or the Aperonix chatbot should
  // take the whole screen the way every other chat app does - the top
  // navbar and bottom tab bar were eating into already-tight space there.
  // Desktop has plenty of room, so it keeps the normal chrome around it.
  const isImmersiveChatPage = /^\/chat\/[^/]+$/.test(pathname || '') || pathname === '/aperonix'

  return (
    <CallProvider>
      <div className="min-h-screen bg-background">
        <Navbar className={isImmersiveChatPage ? 'hidden lg:block' : undefined} />
        <div className="flex">
          <Sidebar />
          <main className={`flex-1 min-w-0 ${isImmersiveChatPage ? 'pb-0 lg:pb-0' : 'pb-16 lg:pb-0'}`}>
            {children}
          </main>
        </div>
        <MobileBottomNav className={isImmersiveChatPage ? 'hidden' : undefined} />
        <GlobalToast />
      </div>
    </CallProvider>
  )
}
