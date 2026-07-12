import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { deleteUploadedFile } from '@/lib/aperonix/geminiFile'

// Best-effort cleanup - called when the Create Post modal closes or after a
// successful post, so nothing lingers in Gemini's or Vercel Blob's storage.
// Always returns success even if something inside fails, since this is
// Just tidying up and should never block or error out the user's flow.
export async function POST(request: NextRequest) {
  try {
    const { geminiFileName, keyIndex, blobUrl } = (await request.json()) as {
      geminiFileName?: string
      keyIndex?: number
      blobUrl?: string
    }

    if (geminiFileName && typeof keyIndex === 'number') {
      await deleteUploadedFile(keyIndex, geminiFileName)
    }

    if (blobUrl) {
      await del(blobUrl).catch(() => {})
    }
  } catch (error) {
    console.error('Aperonix cleanup-media error (non-fatal):', error)
  }

  return NextResponse.json({ ok: true })
}
