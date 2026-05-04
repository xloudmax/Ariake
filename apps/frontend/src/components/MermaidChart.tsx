import { useEffect, useMemo, useRef } from 'react'
import mermaid from 'mermaid'
import { useTheme } from './ThemeProvider'

interface MermaidChartProps {
  code: string
}

export default function MermaidChart ({ code }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const elementId = useMemo(
    () => `mermaid-${Math.random().toString(36).substring(2, 9)}`,
    []
  )

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      if (!containerRef.current) return

      // Initialize with current theme
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: theme === 'dark' ? 'dark' : 'neutral',
      })

      try {
        const { svg } = await mermaid.render(elementId, code)
        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (error) {
        if (isMounted && containerRef.current) {
          const message =
                        error instanceof Error
                          ? error.message
                          : 'Mermaid 图表渲染失败'
          const safeMessage = message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          containerRef.current.innerHTML = `<pre class="mermaid-error">${safeMessage}</pre>`
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [code, elementId, theme])

  return <div className='mermaid-chart' ref={containerRef} role='img' aria-label='Mermaid diagram' />
}
