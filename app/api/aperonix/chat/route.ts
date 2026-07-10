import { NextRequest, NextResponse } from 'next/server'
import { callGemini, GeminiMessage } from '@/lib/aperonix/gemini'
import { APERONIX_SYSTEM_PROMPT } from '@/lib/aperonix/systemPrompt'

interface ChatHistoryItem {
  role: 'user' | 'model'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages, newMessage } = (await request.json()) as {
      messages: ChatHistoryItem[]
      newMessage: string
    }

    if (!newMessage?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Keep only the last 20 turns of history so the request doesn't grow unbounded.
    const trimmedHistory = (messages || []).slice(-20)

    const contents: GeminiMessage[] = [
      ...trimmedHistory.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
      { role: 'user' as const, parts: [{ text: newMessage }] },
    ]

    const reply = await callGemini(APERONIX_SYSTEM_PROMPT, contents)

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Aperonix chat error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}
