import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Being logged in already proves who you are - Supabase's session cookie is
// the identity check here, so no separate password step is needed (and
// Google/OAuth accounts never had a password to check in the first place).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const userId = user.id
  const admin = createAdminClient()

  try {
    await admin.from('notifications').delete().or(`user_id.eq.${userId},actor_id.eq.${userId}`)
    await admin.from('messages').delete().eq('sender_id', userId)
    await admin.from('chats').delete().or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
    await admin.from('comments').delete().eq('user_id', userId)
    await admin.from('likes').delete().eq('user_id', userId)
    await admin.from('follows').delete().or(`follower_id.eq.${userId},following_id.eq.${userId}`)
    await admin.from('stories').delete().eq('user_id', userId)

    const { data: posts } = await admin.from('posts').select('media_url').eq('user_id', userId)
    if (posts) {
      for (const post of posts) {
        if (post.media_url) {
          const path = post.media_url.split('/storage/v1/object/public/posts/')[1]
          if (path) await admin.storage.from('posts').remove([path])
        }
      }
    }
    await admin.from('posts').delete().eq('user_id', userId)

    await admin.from('profiles').delete().eq('id', userId)

    // Finally, remove the actual login account. This is the step the old
    // client-only version was missing - without it, the person could never
    // fully leave, and the email/Google account could never be reused for
    // a fresh signup.
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
    if (authDeleteError) {
      return NextResponse.json({ error: authDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return NextResponse.json({ error: 'Something went wrong deleting your account.' }, { status: 500 })
  }
}
