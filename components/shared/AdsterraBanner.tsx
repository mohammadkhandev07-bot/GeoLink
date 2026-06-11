'use client'

import { useEffect, useRef } from 'react'

interface AdsterraBannerProps {
  slotKey: string
  width?: number
  height?: number
  className?: string
}

/**
 * AdsterraBanner - Uses iframe method for reliable React rendering
 * Script injection via useEffect ensures no SSR conflicts
 * Each instance gets a unique container to prevent atOptions overwrite issues
 */
export function AdsterraBanner({ slotKey, width = 728, height = 90, className }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const publisherId = process.env.NEXT_PUBLIC_ADSTERRA_PUBLISHER_ID

  useEffect(() => {
    if (!containerRef.current || !publisherId || !slotKey) return

    // Clear previous content
    containerRef.current.innerHTML = ''

    // Create isolated iframe for each ad slot to prevent atOptions conflicts
    const iframe = document.createElement('iframe')
    iframe.style.width = `${width}px`
    iframe.style.height = `${height}px`
    iframe.style.border = 'none'
    iframe.style.overflow = 'hidden'
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('frameborder', '0')

    containerRef.current.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) return

    // Write ad script inside isolated iframe context
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>body { margin: 0; padding: 0; overflow: hidden; }</style>
        </head>
        <body>
          <script type='text/javascript'>
            var atOptions = {
              'key': '${slotKey}',
              'format': 'iframe',
              'height': ${height},
              'width': ${width},
              'params': {}
            };
          </scr` + `ipt>
          <script type='text/javascript' src='//www.highperformanceformat.com/${slotKey}/invoke.js'></scr` + `ipt>
        </body>
      </html>
    `)
    iframeDoc.close()
  }, [slotKey, publisherId, width, height])

  if (!publisherId || !slotKey) return null

  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
    >
      <div ref={containerRef} style={{ width, height, overflow: 'hidden' }} />
    </div>
  )
}
