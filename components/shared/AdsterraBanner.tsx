'use client'

import { useEffect, useRef } from 'react'

interface AdsterraBannerProps {
  slotKey: string
  className?: string
}

/**
 * Adsterra Native Banner - iframe method for React compatibility
 * Container ID: 5010391da71e8686d6575168cfc3d9fb
 */
export function AdsterraBanner({ slotKey, className }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (!containerRef.current || loaded.current) return
    loaded.current = true

    // Clear container
    containerRef.current.innerHTML = ''

    // Create isolated iframe
    const iframe = document.createElement('iframe')
    iframe.style.width = '100%'
    iframe.style.height = '120px'
    iframe.style.border = 'none'
    iframe.style.overflow = 'hidden'
    iframe.setAttribute('scrolling', 'no')
    iframe.setAttribute('frameborder', '0')
    containerRef.current.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
  </style>
</head>
<body>
  <scr` + `ipt async="async" data-cfasync="false"
    src="https://pl29784507.effectivecpmnetwork.com/5010391da71e8686d6575168cfc3d9fb/invoke.js">
  </scr` + `ipt>
  <div id="container-5010391da71e8686d6575168cfc3d9fb"></div>
</body>
</html>`)
    doc.close()
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', minHeight: '90px', overflow: 'hidden' }}
    />
  )
}
