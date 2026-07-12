import { NextRequest, NextResponse } from 'next/server'
import { uploadMediaToGemini } from '@/lib/aperonix/geminiFile'

// Uploading + waiting for Gemini to process a video can take a little while,
// So this route gets extra time to run (60s is the max on Vercel's Hobby plan).
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { blobUrl, mimeType } = (await request.json()) as { blobUrl?: string; mimeType?: string }

    if (!blobUrl || !mimeType) {
      return NextResponse.json({ error: 'blobUrl and mimeType are required' }, { status: 400 })
    }

    // Pull the file's bytes down from Vercel Blob (server-to-server, no
    // 4.5MB request-body limit here) so they can be handed to Gemini.
    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok) throw new Error('Could not read the uploaded media')
    const bytes = await blobRes.arrayBuffer()

    const { fileUri, geminiFileName, keyIndex } = await uploadMediaToGemini(bytes, mimeType)

    return NextResponse.json({ fileUri, geminiFileName, keyIndex })
  } catch (error: any) {
    console.error('Aperonix upload-media error:', error)
    return NextResponse.json({ error: 'Try again later.' }, { status: 500 })
  }
}
