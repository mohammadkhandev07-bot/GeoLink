import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Standalone key ya Multiple keys dono ko read karega
const API_KEYS = [
  process.env.ELEVENLABS_API_KEY,
  process.env.ELEVENLABS_API_KEY_1,
  process.env.ELEVENLABS_API_KEY_2,
  process.env.ELEVENLABS_API_KEY_3,
  process.env.ELEVENLABS_API_KEY_4,
  process.env.ELEVENLABS_API_KEY_5,
].filter((key): key is string => Boolean(key && key.trim()))

// Default standard voice ID (Sarah - Multilingual) agar aapki Custom Voice ID me error aaye
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

async function tryKey(apiKey: string, text: string, keyLabel: string): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.85,
          style: 0.25,
          use_speaker_boost: true,
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[aperonix/speak] ${keyLabel} failed: Status ${res.status} - ${body.slice(0, 300)}`)
      return null
    }

    return res
  } catch (err: any) {
    console.error(`[aperonix/speak] ${keyLabel} exception: ${err?.message || err}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    if (API_KEYS.length === 0) {
      console.error('[aperonix/speak] No API keys found in Environment Variables!')
      return NextResponse.json(
        { error: 'TTS API Key missing in Vercel settings' },
        { status: 500 }
      )
    }

    const trimmedText = text.slice(0, 2000)

    for (let i = 0; i < API_KEYS.length; i++) {
      const res = await tryKey(API_KEYS[i], trimmedText, `Key ${i + 1}`)
      if (res) {
        const audioBuffer = await res.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: { 
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'no-cache'
          },
        })
      }
    }

    return NextResponse.json(
      { error: 'All ElevenLabs keys failed or quota exceeded' },
      { status: 503 }
    )
  } catch (error: any) {
    console.error('[aperonix/speak] Server Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
