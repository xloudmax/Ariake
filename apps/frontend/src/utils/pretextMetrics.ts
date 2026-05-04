import { layout, prepare, prepareWithSegments, walkLineRanges } from '@chenglou/pretext'

interface MultilineClampOptions {
  text: string;
  font: string;
  width: number;
  lineHeight: number;
  maxLines: number;
}

interface InlineLabelWidthOptions {
  text: string;
  font: string;
  chromeWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export const measureMultilineClamp = ({
  text,
  font,
  width,
  lineHeight,
  maxLines,
}: MultilineClampOptions) => {
  if (!text || width <= 0) {
    return {
      height: 0,
      lineCount: 0,
      clampedHeight: 0,
      isOverflowing: false,
    }
  }

  try {
    const prepared = prepare(text, font)
    const { height, lineCount } = layout(prepared, width, lineHeight)

    return {
      height,
      lineCount,
      clampedHeight: Math.min(height, lineHeight * maxLines),
      isOverflowing: lineCount > maxLines,
    }
  } catch {
    const approximateLineCount = Math.max(1, Math.ceil(text.length / Math.max(1, Math.floor(width / 8))))
    return {
      height: approximateLineCount * lineHeight,
      lineCount: approximateLineCount,
      clampedHeight: Math.min(approximateLineCount * lineHeight, lineHeight * maxLines),
      isOverflowing: approximateLineCount > maxLines,
    }
  }
}

export const measureInlineLabelWidth = ({
  text,
  font,
  chromeWidth = 0,
  minWidth = 0,
  maxWidth,
}: InlineLabelWidthOptions) => {
  if (!text) return minWidth

  try {
    const prepared = prepareWithSegments(text, font)
    let naturalWidth = 0
    walkLineRanges(prepared, Number.MAX_SAFE_INTEGER, (line) => {
      naturalWidth = Math.max(naturalWidth, line.width)
    })
    const computed = Math.ceil(naturalWidth + chromeWidth)
    const clamped = Math.max(minWidth, computed)
    return typeof maxWidth === 'number' ? Math.min(maxWidth, clamped) : clamped
  } catch {
    const fallback = Math.ceil(text.length * 8 + chromeWidth)
    const clamped = Math.max(minWidth, fallback)
    return typeof maxWidth === 'number' ? Math.min(maxWidth, clamped) : clamped
  }
}
