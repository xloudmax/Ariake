import { RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { measureMultilineClamp } from '@/utils/pretextMetrics'

interface PretextClampOptions {
  text: string;
  font: string;
  lineHeight: number;
  maxLines: number;
}

export const usePretextClamp = <T extends HTMLElement>({
  text,
  font,
  lineHeight,
  maxLines,
}: PretextClampOptions): {
  ref: RefObject<T | null>;
  clampedHeight: number;
  isOverflowing: boolean;
  lineCount: number;
} => {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const updateWidth = () => {
      setWidth(element.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const metrics = useMemo(() => {
    return measureMultilineClamp({
      text,
      font,
      width,
      lineHeight,
      maxLines,
    })
  }, [font, lineHeight, maxLines, text, width])

  return {
    ref,
    clampedHeight: metrics.clampedHeight,
    isOverflowing: metrics.isOverflowing,
    lineCount: metrics.lineCount,
  }
}
