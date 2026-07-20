import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called on a schedule by Vercel Cron (see vercel.json - runs hourly).
// Stories already stop being *shown* to anyone the instant they pass 24h
// (the database RLS policy filters `expires_at > NOW()`), so this route's
// only job is the actual cleanup: remove expired rows from the database and
// delete their matching files from the "stories" storage bucket, so
// storage usage doesn't grow forever.
export async function GET(request: NextRequest) {
  // Protect the endpoint so randoms on the internet can't spam-trigger it.
  const authHeader = request.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Grab expired stories first so we know which storage files to remove.
  const { data: expired, error: fetchError } = await supabase
    .from('stories')
    .select('id, media_url')
    .lte('expires_at', new Date().toISOString())

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  // Extract storage paths ("<userId>/<filename>") from each public URL and
  // delete the actual files from the "stories" bucket.
  const paths = expired
    .map((s) => s.media_url)
    .filter((url): url is string => !!url)
    .map((url) => {
      const marker = '/storage/v1/object/public/stories/'
      const idx = url.indexOf(marker)
      return idx === -1 ? null : url.slice(idx + marker.length)
    })
    .filter((p): p is string => !!p)

  if (paths.length > 0) {
    await supabase.storage.from('stories').remove(paths)
  }

  const { error: deleteError } = await supabase
    .from('stories')
    .delete()
    .in('id', expired.map((s) => s.id))

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: expired.length })
}
