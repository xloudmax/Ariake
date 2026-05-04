'use client'

import { type MotionValue, useSpring } from 'framer-motion'
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { LiquidFilter, type LiquidFilterProps } from './filter'

/**
 * Safely parse border radius from computed styles, handling edge cases like
 * scientific notation (from rounded-full), percentages, and invalid values.
 */
const getBorderRadius = (element: HTMLElement, rect: DOMRect): number => {
  const computedStyle = getComputedStyle(element)
  const rawRadius = computedStyle.borderRadius

  if (!rawRadius || rawRadius === '0px') {
    return 0
  }

  const parsedRadius = parseFloat(rawRadius)

  if (Number.isNaN(parsedRadius)) {
    return 0
  }

  if (parsedRadius > 9999 || rawRadius.includes('e+') || rawRadius.includes('E+')) {
    return Math.min(rect.width, rect.height) / 2
  }

  return parsedRadius
}

export const useMotionSizeObservers = <T extends HTMLElement = HTMLDivElement>(
  containerRef: React.RefObject<T | null>,
  disabled: boolean = false
) => {
  const width = useSpring(1, { stiffness: 200, damping: 40 })
  const height = useSpring(1, { stiffness: 200, damping: 40 })
  const borderRadius = useSpring(0, { stiffness: 200, damping: 40 })

  const isUpdating = useRef(false)
  const isFirstUpdate = useRef(true)

  const updateDimensions = useCallback(() => {
    if (!containerRef.current || disabled || isUpdating.current) return

    isUpdating.current = true

    const rect = containerRef.current.getBoundingClientRect()
    const borderRadiusValue = getBorderRadius(containerRef.current, rect)

    const newWidth = Math.max(rect.width, 1)
    const newHeight = Math.max(rect.height, 1)
    const newRadius = Math.max(borderRadiusValue, 0)

    const shouldForceJump = isFirstUpdate.current && newWidth > 1 && newHeight > 1

    if (shouldForceJump) {
      width.jump(newWidth)
      height.jump(newHeight)
      borderRadius.jump(newRadius)
      isFirstUpdate.current = false
    } else {
      if (Math.abs(width.get() - newWidth) > 0.5) {
        width.set(newWidth)
      }
      if (Math.abs(height.get() - newHeight) > 0.5) {
        height.set(newHeight)
      }
      if (Math.abs(borderRadius.get() - newRadius) > 0.5) {
        borderRadius.set(newRadius)
      }
    }

    setTimeout(() => {
      isUpdating.current = false
    }, 16)
  }, [containerRef, disabled, width, height, borderRadius])

  useLayoutEffect(() => {
    const ref = containerRef.current
    if (!ref || disabled) return

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })

    resizeObserver.observe(ref)
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
    }
  }, [disabled, updateDimensions, containerRef])

  useEffect(() => {
    const ref = containerRef.current
    if (!ref || disabled) return

    let timeoutId: ReturnType<typeof setTimeout>
    const mutationObserver = new MutationObserver(() => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateDimensions, 150)
    })

    mutationObserver.observe(ref, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => {
      clearTimeout(timeoutId)
      mutationObserver.disconnect()
    }
  }, [disabled, updateDimensions, containerRef])

  return {
    width,
    height,
    borderRadius,
  }
}

export interface LiquidGlassProps<T extends HTMLElement = HTMLDivElement>
  extends Pick<
        LiquidFilterProps,
        | 'glassThickness'
        | 'bezelWidth'
        | 'blur'
        | 'bezelHeightFn'
        | 'refractiveIndex'
        | 'specularOpacity'
        | 'specularSaturation'
        | 'dpr'
    > {
  disableRefraction?: boolean;
  targetRef?: React.RefObject<T | null>;
  width?: MotionValue<number>;
  height?: MotionValue<number>;
  borderRadius?: MotionValue<number>;
}

export const useLiquidSurface = <T extends HTMLElement = HTMLDivElement>({
  disableRefraction = false,
  targetRef,
  width: widthProp,
  height: heightProp,
  borderRadius: borderRadiusProp,
  ...props
}: LiquidGlassProps<T>) => {
  const rawId = useId().replace(/:/g, '')
  const filterId = `glass-${rawId}`
  const rawRef = useRef<T>(null)
  const ref = targetRef ?? rawRef

  const usePropValues = widthProp && heightProp && borderRadiusProp
  const {
    width: observedWidth,
    height: observedHeight,
    borderRadius: observedRadius,
  } = useMotionSizeObservers(ref, Boolean(usePropValues))

  const finalWidth = usePropValues ? widthProp : observedWidth
  const finalHeight = usePropValues ? heightProp : observedHeight
  const finalRadius = usePropValues ? borderRadiusProp : observedRadius

  const filterNode = disableRefraction
    ? null
    : (
      <LiquidFilter
        id={filterId}
        width={finalWidth}
        height={finalHeight}
        radius={finalRadius}
        glassThickness={props.glassThickness}
        bezelWidth={props.bezelWidth}
        blur={props.blur}
        bezelHeightFn={props.bezelHeightFn}
        refractiveIndex={props.refractiveIndex}
        specularOpacity={props.specularOpacity}
        specularSaturation={props.specularSaturation}
        dpr={props.dpr}
      />
      )

  const filterStyles: React.CSSProperties = disableRefraction
    ? {}
    : {
        backdropFilter: `url(#${filterId})`,
        WebkitBackdropFilter: `url(#${filterId})`,
      }

  return { filterId, filterStyles, ref, filterNode, finalWidth, finalHeight, finalRadius }
}
