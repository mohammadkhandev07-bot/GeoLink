import { NextRequest, NextResponse } from 'next/server'
import { callGemini, extractText, GeminiMessage } from '@/lib/aperonix/gemini'
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

    const content = await callGemini('chat', APERONIX_SYSTEM_PROMPT, contents)
    const reply = extractText(content) || "Sorry, I couldn't come up with a reply. Try again?"

    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error('Aperonix chat error:', error)
    return NextResponse.json({ error: 'Try again later.' }, { status: 500 })
  }
}
