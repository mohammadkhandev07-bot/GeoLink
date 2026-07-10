import { NextRequest, NextResponse } from 'next/server'
import { callGemini, GeminiMessage } from '@/lib/aperonix/gemini'

const FIELD_PROMPTS: Record<string, string> = {
  title: `Watch/look at this media and write ONE short, catchy title for a social media post (max 100 characters). Reply with ONLY the title text - no quotes, no labels, no extra commentary.`,
  description: `Watch/look at this media and write an engaging caption/description for a social media post (max 2200 characters). Reply with ONLY the caption text - no quotes, no labels, no extra commentary.`,
  hashtags: `Watch/look at this media and generate EXACTLY 5 relevant hashtags for a social media post about it. One of the 5 must always be #GeoLink. Reply with ONLY the 5 hashtags separated by single spaces, in the format "#GeoLink #tag2 #tag3 #tag4 #tag5" - no extra commentary, no line breaks.`,
}

export async function POST(request: NextRequest) {
  try {
    const { mediaBase64, mimeType, field, regenerate, previousResult } = (await request.json()) as {
      mediaBase64: string
      mimeType: string
      field: 'title' | 'description' | 'hashtags'
      regenerate?: boolean
      previousResult?: string
    }

    if (!mediaBase64 || !mimeType || !field || !FIELD_PROMPTS[field]) {
      return NextResponse.json({ error: 'mediaBase64, mimeType and a valid field are required' }, { status: 400 })
    }

    let promptText = FIELD_PROMPTS[field]
    if (regenerate && previousResult) {
      promptText += ` You already suggested: "${previousResult}". Give a noticeably different alternative this time.`
    }

    const contents: GeminiMessage[] = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: mediaBase64 } },
          { text: promptText },
        ],
      },
    ]

    const systemPrompt = 'You are Aperonix, GeoLink\'s official AI assistant, made by Mohammad Khan. You help users write great post captions, titles, and hashtags by analyzing their photo or video.'

    const result = await callGemini(systemPrompt, contents)

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Aperonix generate error:', error)
    return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 })
  }
}
