'use client'

import { useCallback, useEffect, useState } from 'react'

export interface AperonixMessage {
  role: 'user' | 'model'
  content: string
  timestamp: number
}

export interface AperonixConversation {
  id: string
  title: string
  messages: AperonixMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'aperonix-chats'

function loadConversations(): AperonixConversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AperonixConversation[]
  } catch {
    return []
  }
}

function saveConversations(conversations: AperonixConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // localStorage full/unavailable - fail silently, chat still works for this session
  }
}

export function useAperonixChats() {
  const [conversations, setConversations] = useState<AperonixConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadedConvos = loadConversations()
    setConversations(loadedConvos)
    setLoaded(true)
  }, [])

  const persist = useCallback((next: AperonixConversation[]) => {
    setConversations(next)
    saveConversations(next)
  }, [])

  const createConversation = useCallback(() => {
    const newConvo: AperonixConversation = {
      id: crypto.randomUUID(),
      title: 'New chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    persist([newConvo, ...conversations])
    setActiveId(newConvo.id)
    return newConvo.id
  }, [conversations, persist])

  const deleteConversation = useCallback((id: string) => {
    const next = conversations.filter(c => c.id !== id)
    persist(next)
    if (activeId === id) setActiveId(null)
  }, [conversations, persist, activeId])

  const addMessage = useCallback((conversationId: string, message: AperonixMessage) => {
    setConversations(prev => {
      const next = prev.map(c => {
        if (c.id !== conversationId) return c
        const messages = [...c.messages, message]
        const title = c.messages.length === 0 && message.role === 'user'
          ? message.content.slice(0, 40) + (message.content.length > 40 ? '…' : '')
          : c.title
        return { ...c, messages, title, updatedAt: Date.now() }
      })
      saveConversations(next)
      return next
    })
  }, [])

  const activeConversation = conversations.find(c => c.id === activeId) ?? null

  return {
    conversations: [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    activeId,
    setActiveId,
    activeConversation,
    createConversation,
    deleteConversation,
    addMessage,
    loaded,
  }
}
