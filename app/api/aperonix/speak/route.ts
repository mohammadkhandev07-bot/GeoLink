import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// Five separate free ElevenLabs accounts, each with its own ~10,000
// character/month quota. Trying them in order and moving to the next one
// the moment any single key fails (quota used up, rate-limited, invalid,
// etc.) effectively pools all five quotas together - about 50,000
// characters/month combined - and resets automatically whenever
// ElevenLabs resets each account's monthly usage.
const API_KEYS = [
  process.env.ELEVENLABS_API_KEY_1,
  process.env.ELEVENLABS_API_KEY_2,
  process.env.ELEVENLABS_API_KEY_3,
  process.env.ELEVENLABS_API_KEY_4,
  process.env.ELEVENLABS_API_KEY_5,
].filter((key): key is string => !!key)

const VOICE_ID = 'tIb1FHpzlwSiTGg6JxF0'

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

    // 401/429 usually mean this specific key is out of quota or
    // rate-limited - move on to the next account rather than giving up.
    if (!res.ok) {
      // Logged so the real reason (bad key, quota_exceeded, wrong voice id,
      // etc.) shows up in Vercel's Function Logs instead of just a generic
      // 503 on the client with no way to tell what actually went wrong.
      const body = await res.text().catch(() => '')
      console.error(`[aperonix/speak] ${keyLabel} failed: ${res.status} ${body.slice(0, 300)}`)
      return null
    }
    return res
  } catch (err: any) {
    console.error(`[aperonix/speak] ${keyLabel} threw: ${err?.message || err}`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  console.error(`[aperonix/speak] ${API_KEYS.length}/5 ElevenLabs keys configured`)
  try {
    const { text } = await req.json()
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // ElevenLabs charges per character - keep a sane cap per request so one
    // very long reply can't blow through a whole account's monthly quota
    // by itself.
    const trimmedText = text.slice(0, 2000)

    if (API_KEYS.length === 0) {
      // No keys configured at all (env vars missing, or added without a
      // redeploy - Vercel only picks up new env vars on the next deploy).
      console.error('[aperonix/speak] No ELEVENLABS_API_KEY_1..5 env vars found')
      return NextResponse.json({ error: 'TTS not configured' }, { status: 503 })
    }

    for (let i = 0; i < API_KEYS.length; i++) {
      const res = await tryKey(API_KEYS[i], trimmedText, `Key ${i + 1}`)
      if (res) {
        const audioBuffer = await res.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: { 'Content-Type': 'audio/mpeg' },
        })
      }
      // This key failed (quota/rate-limit/invalid) - silently try the next
      // one in the list.
    }

    // Every single account is exhausted or failing - signal the frontend to
    // fall back to the browser's own voice so the person still hears a
    // reply instead of nothing at all.
    return NextResponse.json({ error: 'All ElevenLabs accounts unavailable' }, { status: 503 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 })
  }
}
