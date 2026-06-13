import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - login chahiye
  if (!user && (
    pathname.startsWith('/feed') ||
    pathname.startsWith('/explore') ||
    pathname.startsWith('/reels') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes - agar login hai toh feed pe bhejo
  if (user && (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-email')
  )) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/feed/:path*',
    '/explore/:path*',
    '/reels/:path*',
    '/chat/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
    '/verify-email',
  ],
}
