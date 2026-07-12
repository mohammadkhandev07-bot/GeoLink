import { NextRequest, NextResponse } from 'next/server'
import { callGemini, extractText, GeminiMessage } from '@/lib/aperonix/gemini'
import { generateFromUploadedFile } from '@/lib/aperonix/geminiFile'

export const maxDuration = 60

const MEDIA_PROMPTS: Record<string, string> = {
  title: `Watch and listen to this media in full (visuals AND audio/music) and write ONE short, catchy title for a social media post (max 100 characters). Reply with ONLY the title text - no quotes, no labels, no extra commentary.`,
  description: `Watch and listen to this media in full (visuals AND audio/music) and write an engaging caption/description for a social media post. Keep it to at most 100 words. Do NOT include any hashtags anywhere in this text - hashtags are handled in a separate field. Reply with ONLY the caption text - no quotes, no labels, no extra commentary.`,
  hashtags: `Watch and listen to this media in full (visuals AND audio/music) and generate EXACTLY 5 relevant hashtags for a social media post about it. One of the 5 must always be #GeoLink. Reply with ONLY the 5 hashtags separated by single spaces, in the format "#GeoLink #tag2 #tag3 #tag4 #tag5" - no extra commentary, no line breaks.`,
}

const TEXT_PROMPTS: Record<string, string> = {
  title: `Based on the following instructions from the user, write ONE short, catchy title for a text-only social media post (max 100 characters). User's instructions: "{context}". Reply with ONLY the title text - no quotes, no labels, no extra commentary.`,
  description: `Based on the following instructions from the user, write an engaging caption/description for a text-only social media post. Keep it to at most 100 words. Do NOT include any hashtags anywhere in this text - hashtags are handled in a separate field. User's instructions: "{context}". Reply with ONLY the caption text - no quotes, no labels, no extra commentary.`,
  hashtags: `Based on the following instructions from the user, generate EXACTLY 5 relevant hashtags for a text-only social media post. One of the 5 must always be #GeoLink. User's instructions: "{context}". Reply with ONLY the 5 hashtags separated by single spaces, in the format "#GeoLink #tag2 #tag3 #tag4 #tag5" - no extra commentary, no line breaks.`,
}

const SYSTEM_PROMPT = 'You are Aperonix, GeoLink\'s official AI assistant, made by Mohammad Khan. You help users write great post titles, captions, and hashtags - either by fully watching/listening to their photo or video, or from instructions they type for a text-only post.'

export async function POST(request: NextRequest) {
  try {
    const { fileUri, mimeType, keyIndex, context, field, regenerate, previousResult } = (await request.json()) as {
      fileUri?: string
      mimeType?: string
      keyIndex?: number
      context?: string
      field: 'title' | 'description' | 'hashtags'
      regenerate?: boolean
      previousResult?: string
    }

    const hasMedia = !!fileUri && !!mimeType && typeof keyIndex === 'number'
    const hasContext = !!context?.trim()

    if (!field || (!hasMedia && !hasContext)) {
      return NextResponse.json(
        { error: 'Either an uploaded media file or a context description is required, along with a valid field.' },
        { status: 400 }
      )
    }

    let promptText = hasMedia
      ? MEDIA_PROMPTS[field]
      : TEXT_PROMPTS[field]?.replace('{context}', context!.trim())

    if (!promptText) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    if (regenerate && previousResult) {
      promptText += ` You already suggested: "${previousResult}". Give a noticeably different alternative this time.`
    }

    if (hasMedia) {
      const result = await generateFromUploadedFile(keyIndex!, fileUri!, mimeType!, SYSTEM_PROMPT, promptText)
      return NextResponse.json({ result })
    }

    const contents: GeminiMessage[] = [{ role: 'user', parts: [{ text: promptText }] }]
    const content = await callGemini('generate', SYSTEM_PROMPT, contents)
    const result = extractText(content)
    if (!result) throw new Error('Empty response')

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('Aperonix generate error:', error)
    return NextResponse.json({ error: 'Try again later.' }, { status: 500 })
  }
}
