import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

// Authorizes direct browser -> Vercel Blob uploads for the "Generate with
// Aperonix" feature, bypassing Vercel's ~4.5MB serverless function body
// limit entirely (the video bytes never pass through our own function here -
// They go straight from the user's browser to Blob storage).
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'],
          maximumSizeInBytes: 300 * 1024 * 1024, // 300MB cap - well beyond a typical reel
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // No action needed here - the frontend gets the blob URL directly
        // from the upload() call and immediately hands it to /generate.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
