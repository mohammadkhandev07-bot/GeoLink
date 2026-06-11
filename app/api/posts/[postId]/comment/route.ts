import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: params.postId, user_id: user.id, content })
    .select('*, profiles(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await supabase.rpc('increment_comments', { post_id: params.postId })
  return NextResponse.json(data, { status: 201 })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(*)')
    .eq('post_id', params.postId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
