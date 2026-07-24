'use client'

import { useMemo, useState } from 'react'
import { X, Search, Check } from 'lucide-react'
import { GOOGLE_FONTS, loadGoogleFont } from '@/lib/utils/googleFonts'

interface FontPickerProps {
  currentFont: string | null
  onSelect: (font: string) => void
  onClose: () => void
}

export function FontPicker({ currentFont, onSelect, onClose }: FontPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return GOOGLE_FONTS
    const q = query.trim().toLowerCase()
    return GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q))
  }, [query])

  const handlePick = (font: string) => {
    loadGoogleFont(font)
    onSelect(font)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl h-[80vh] sm:h-[70vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-bold text-lg">Choose Font</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search box */}
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts..."
              className="w-full bg-muted rounded-full pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-500/40"
            />
          </div>
        </div>

        {/* Font list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {/* Default option */}
          <button
            onClick={() => handlePick('')}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors text-left"
          >
            <span className="text-sm font-medium">Default</span>
            {(!currentFont || currentFont === '') && <Check className="h-4 w-4 text-pink-500" />}
          </button>

          {filtered.map((font) => (
            <button
              key={font}
              onClick={() => handlePick(font)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-accent transition-colors text-left"
            >
              <span className="text-base truncate" style={{ fontFamily: `'${font}', sans-serif` }}>
                {font}
              </span>
              {currentFont === font && <Check className="h-4 w-4 text-pink-500 shrink-0" />}
            </button>
          ))}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No fonts found. Try another search.</p>
          )}
        </div>
      </div>
    </div>
  )
}
