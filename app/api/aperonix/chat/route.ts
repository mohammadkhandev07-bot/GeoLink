import { NextRequest, NextResponse } from 'next/server'
import { callGemini, extractText, GeminiMessage, GeminiPart } from '@/lib/aperonix/gemini'
import { APERONIX_SYSTEM_PROMPT } from '@/lib/aperonix/systemPrompt'

export const maxDuration = 30

interface ChatHistoryItem {
  role: 'user' | 'model'
  content: string
}

interface MediaInput {
  mimeType: string
  data: string // base64, no "data:" prefix
}

export async function POST(request: NextRequest) {
  try {
    const { messages, newMessage, media } = (await request.json()) as {
      messages: ChatHistoryItem[]
      newMessage: string
      media?: MediaInput
    }

    // A photo/video with no caption is still a valid message - only reject
    // when there's genuinely nothing to send.
    if (!newMessage?.trim() && !media) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Keep only the last 20 turns of history so the request doesn't grow unbounded.
    const trimmedHistory = (messages || []).slice(-20)

    const userParts: GeminiPart[] = []
    if (media) {
      userParts.push({ inlineData: { mimeType: media.mimeType, data: media.data } })
    }
    userParts.push({ text: newMessage?.trim() || 'Describe what you see in a friendly way.' })

    const contents: GeminiMessage[] = [
      ...trimmedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user' as const, parts: userParts },
    ]

    const content = await callGemini('chat', APERONIX_SYSTEM_PROMPT, contents)
    const reply = extractText(content) || "Sorry, I couldn't come up with a reply. Try again?"

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Aperonix chat error:', error)
    return NextResponse.json({ error: 'Try again later.' }, { status: 500 })
  }
}
