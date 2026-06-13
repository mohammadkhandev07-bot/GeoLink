import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Middleware sirf basic kaam karega - Supabase session check nahi
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
