import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  // Supabase client banao
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // User check karo
  const { data: { user } } = await supabase.auth.getUser()

  // Protected pages - bina login nahi milenge
  const protectedPaths = ['/feed', '/explore', '/reels', '/chat', '/profile', '/settings']
  const isProtected = protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  // Auth pages - login ke baad nahi milenge
  const authPaths = ['/login', '/signup', '/verify-email']
  const isAuth = authPaths.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!user && isProtected) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  if (user && isAuth) {
    const url = new URL('/feed', request.url)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/feed',
    '/feed/:path*',
    '/explore',
    '/explore/:path*',
    '/reels',
    '/reels/:path*',
    '/chat',
    '/chat/:path*',
    '/profile',
    '/profile/:path*',
    '/settings',
    '/settings/:path*',
    '/login',
    '/signup',
    '/verify-email',
  ],
}
