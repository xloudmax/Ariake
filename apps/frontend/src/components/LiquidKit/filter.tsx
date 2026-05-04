import React, { useEffect, useState } from 'react'
import { MotionValue, motion, useTransform } from 'framer-motion'
import { CONVEX, calculateRefractionSpecular, getDisplacementData, getValueOrMotion } from './liquid-lib'

const MAX_FILTER_CACHE_ENTRIES = 48
const displacementDataCache = new Map<string, ReturnType<typeof getDisplacementData>>()
const specularLayerCache = new Map<string, ReturnType<typeof calculateRefractionSpecular>>()
const imageDataUrlCache = new Map<string, string>()
type BezelHeightFn = (x: number) => number
const filterFnIds = new WeakMap<BezelHeightFn, string>()
let filterFnCounter = 0

function setLRUCache<T> (cache: Map<string, T>, key: string, value: T): T {
  if (cache.has(key)) {
    cache.delete(key)
  }
  cache.set(key, value)
  if (cache.size > MAX_FILTER_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey) {
      cache.delete(oldestKey)
    }
  }
  return value
}

function getFunctionCacheId (fn: BezelHeightFn): string {
  const cached = filterFnIds.get(fn)
  if (cached) {
    return cached
  }
  const next = `fn-${filterFnCounter++}`
  filterFnIds.set(fn, next)
  return next
}

function quantize (value: number, step: number, minimum: number = 0): number {
  if (!Number.isFinite(value)) {
    return minimum
  }
  return Math.max(minimum, Math.round(value / step) * step)
}

function imageDataToUrl (imageData: ImageData): string {
  if (typeof document === 'undefined') {
    return ''
  }

  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL()
}

export type LiquidFilterProps = {
  id: string;
  filterOnly?: boolean;
  scaleRatio?: MotionValue<number>;
  canvasWidth?: number | MotionValue<number>;
  canvasHeight?: number | MotionValue<number>;
  width: number | MotionValue<number>;
  height: number | MotionValue<number>;
  radius: number | MotionValue<number>;
  blur?: number | MotionValue<number>;
  glassThickness?: number | MotionValue<number>;
  bezelWidth?: number | MotionValue<number>;
  refractiveIndex?: number | MotionValue<number>;
  specularOpacity?: number | MotionValue<number>;
  specularSaturation?: number | MotionValue<number>;
  dpr?: number | MotionValue<number>;
  bezelHeightFn?: (x: number) => number;
}

export const LiquidFilter: React.FC<LiquidFilterProps> = React.memo(({
  id,
  filterOnly = false,
  canvasWidth,
  canvasHeight,
  width,
  height,
  radius,
  blur = 0.2,
  glassThickness = 40,
  bezelWidth: bezelWidthProp = 20,
  refractiveIndex = 1.5,
  scaleRatio,
  specularOpacity = 1,
  specularSaturation = 4,
  bezelHeightFn = CONVEX.fn,
  dpr,
}) => {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getQuantizedMetrics = () => {
    const rawCanvasWidth = Math.round(canvasWidth ? getValueOrMotion(canvasWidth) : getValueOrMotion(width))
    const rawCanvasHeight = Math.round(canvasHeight ? getValueOrMotion(canvasHeight) : getValueOrMotion(height))
    const devicePixelRatio = dpr ? getValueOrMotion(dpr) : 1
    const dimensionStep = devicePixelRatio >= 3 ? 6 : 4
    const radiusStep = devicePixelRatio >= 3 ? 4 : 2
    const radiusVal = quantize(getValueOrMotion(radius), radiusStep)
    const bezelWidthVal = Math.max(
      Math.min(getValueOrMotion(bezelWidthProp), Math.max(2 * radiusVal - 1, 0)),
      0
    )
    const quantizedCanvasWidth = quantize(rawCanvasWidth, dimensionStep, 1)
    const quantizedCanvasHeight = quantize(rawCanvasHeight, dimensionStep, 1)

    return {
      canvasWidth: quantizedCanvasWidth,
      canvasHeight: quantizedCanvasHeight,
      width: quantize(getValueOrMotion(width), dimensionStep, 1),
      height: quantize(getValueOrMotion(height), dimensionStep, 1),
      radius: Math.max(radiusVal, 0),
      bezelWidth: quantize(bezelWidthVal, 2, 0),
      glassThickness: quantize(getValueOrMotion(glassThickness), 2, 0),
      refractiveIndex: quantize(getValueOrMotion(refractiveIndex), 0.05, 1),
      specularOpacity: quantize(getValueOrMotion(specularOpacity), 0.05, 0),
      specularSaturation: quantize(getValueOrMotion(specularSaturation), 0.25, 0),
      blur: quantize(getValueOrMotion(typeof blur === 'number' ? blur : blur), 0.05, 0),
      dpr: devicePixelRatio,
      filterWidth: canvasWidth ? getValueOrMotion(canvasWidth) : getValueOrMotion(width),
      filterHeight: canvasHeight ? getValueOrMotion(canvasHeight) : getValueOrMotion(height),
      fnId: getFunctionCacheId(bezelHeightFn),
    }
  }

  const displacementData = useTransform(() => {
    const metrics = getQuantizedMetrics()
    const cacheKey = [
      metrics.canvasWidth,
      metrics.canvasHeight,
      metrics.width,
      metrics.height,
      metrics.radius,
      metrics.bezelWidth,
      metrics.glassThickness,
      metrics.refractiveIndex,
      metrics.dpr,
      metrics.fnId,
    ].join(':')

    const cached = displacementDataCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    return setLRUCache(displacementDataCache, cacheKey, getDisplacementData({
      glassThickness: metrics.glassThickness,
      bezelWidth: metrics.bezelWidth,
      bezelHeightFn,
      refractiveIndex: metrics.refractiveIndex,
      canvasWidth: metrics.canvasWidth,
      canvasHeight: metrics.canvasHeight,
      objectWidth: metrics.width,
      objectHeight: metrics.height,
      radius: metrics.radius,
      dpr: metrics.dpr,
    }))
  })

  const specularLayer = useTransform(() => {
    const metrics = getQuantizedMetrics()
    const cacheKey = [
      metrics.width,
      metrics.height,
      metrics.radius,
      metrics.bezelWidth,
      metrics.dpr,
    ].join(':')

    const cached = specularLayerCache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    return setLRUCache(specularLayerCache, cacheKey, calculateRefractionSpecular(
      metrics.width,
      metrics.height,
      metrics.radius,
      50,
      metrics.bezelWidth,
      metrics.dpr
    ))
  })

  const displacementMapDataUrl = useTransform(() => {
    const metrics = getQuantizedMetrics()
    const cacheKey = `disp:${[
            metrics.canvasWidth,
            metrics.canvasHeight,
            metrics.width,
            metrics.height,
            metrics.radius,
            metrics.bezelWidth,
            metrics.glassThickness,
            metrics.refractiveIndex,
            metrics.dpr,
            metrics.fnId,
        ].join(':')}`
    const cached = imageDataUrlCache.get(cacheKey)
    if (cached) {
      return cached
    }
    const data = displacementData.get()
    const url = data ? imageDataToUrl(data.displacementMap) : ''
    return setLRUCache(imageDataUrlCache, cacheKey, url)
  })

  const specularLayerDataUrl = useTransform(() => {
    const metrics = getQuantizedMetrics()
    const cacheKey = `spec:${[
            metrics.width,
            metrics.height,
            metrics.radius,
            metrics.bezelWidth,
            metrics.dpr,
        ].join(':')}`
    const cached = imageDataUrlCache.get(cacheKey)
    if (cached) {
      return cached
    }
    const layer = specularLayer.get()
    const url = layer ? imageDataToUrl(layer) : ''
    return setLRUCache(imageDataUrlCache, cacheKey, url)
  })

  const baseScale = useTransform(() => {
    const data = displacementData.get()
    return (data ? data.maximumDisplacement : 0) * (scaleRatio?.get() ?? 1)
  })

  // Chromatic Aberration scales
  const scaleR = useTransform(baseScale, (s) => s * 1.0)
  const scaleG = useTransform(baseScale, (s) => s * 1.02)
  const scaleB = useTransform(baseScale, (s) => s * 1.04)

  // Unconditionally call useTransform to comply with Rules of Hooks
  const staticBlurTransform = useTransform(() => getQuantizedMetrics().blur)
  const blurDeviation = typeof blur === 'object' && 'get' in blur ? blur : staticBlurTransform

  const filterWidth = useTransform(() => getQuantizedMetrics().filterWidth)
  const filterHeight = useTransform(() => getQuantizedMetrics().filterHeight)

  // Specular layer image dimensions (must be at top-level, not inline in JSX)
  const specularImageWidth = useTransform(() => (canvasWidth ? getValueOrMotion(canvasWidth) : getValueOrMotion(width)))
  const specularImageHeight = useTransform(() => (canvasHeight ? getValueOrMotion(canvasHeight) : getValueOrMotion(height)))

  const content = (
    <filter id={id} colorInterpolationFilters='sRGB'>
      <motion.feGaussianBlur
        in='SourceGraphic'
        stdDeviation={blurDeviation}
        result={`blurred_source_${id}`}
      />

      <motion.feImage
        href={displacementMapDataUrl}
        x={0}
        y={0}
        width={filterWidth}
        height={filterHeight}
        result={`raw_displacement_map_${id}`}
      />
      <feGaussianBlur in={`raw_displacement_map_${id}`} stdDeviation='0.5' result={`displacement_map_${id}`} />

      <feColorMatrix
        in={`blurred_source_${id}`}
        type='matrix'
        values='1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
        result={`r_channel_${id}`}
      />
      <feColorMatrix
        in={`blurred_source_${id}`}
        type='matrix'
        values='0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
        result={`g_channel_${id}`}
      />
      <feColorMatrix
        in={`blurred_source_${id}`}
        type='matrix'
        values='0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
        result={`b_channel_${id}`}
      />

      <motion.feDisplacementMap
        in={`r_channel_${id}`}
        in2={`displacement_map_${id}`}
        scale={scaleR}
        xChannelSelector='R'
        yChannelSelector='G'
        result={`displaced_r_${id}`}
      />
      <motion.feDisplacementMap
        in={`g_channel_${id}`}
        in2={`displacement_map_${id}`}
        scale={scaleG}
        xChannelSelector='R'
        yChannelSelector='G'
        result={`displaced_g_${id}`}
      />
      <motion.feDisplacementMap
        in={`b_channel_${id}`}
        in2={`displacement_map_${id}`}
        scale={scaleB}
        xChannelSelector='R'
        yChannelSelector='G'
        result={`displaced_b_${id}`}
      />

      <feBlend in={`displaced_r_${id}`} in2={`displaced_g_${id}`} mode='screen' result={`rg_${id}`} />
      <feBlend in={`rg_${id}`} in2={`displaced_b_${id}`} mode='screen' result={`displaced_${id}`} />

      {/* 1. 生成一张全局极其鲜艳的变体图 (吸取饱和度参数) */}
      <motion.feColorMatrix
        in={`displaced_${id}`}
        type='saturate'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
        values={getValueOrMotion(specularSaturation) as any}
        result={`super_saturated_bg_${id}`}
      />

      {/* 2. 加载你的白色高光蒙版 */}
      <motion.feImage
        href={specularLayerDataUrl}
        x={0}
        y={0}
        width={specularImageWidth}
        height={specularImageHeight}
        result={`raw_specular_layer_${id}`}
      />

      {/* 让他稍微柔和一点点 */}
      <feGaussianBlur in={`raw_specular_layer_${id}`} stdDeviation='0.5' result={`specular_layer_${id}`} />

      {/* 3. 灵魂核心：用高光的形状，把那张超高饱和度的图抠出来 (operator="in") */}
      <feComposite
        in={`super_saturated_bg_${id}`}
        in2={`specular_layer_${id}`}
        operator='in'
        result={`colored_edge_glow_${id}`}
      />

      {/* 4. 降低纯白色高光的透明度 */}
      <feComponentTransfer in={`specular_layer_${id}`} result={`specular_white_faded_${id}`}>
        <motion.feFuncA type='linear' slope={specularOpacity} />
      </feComponentTransfer>

      {/* 5. 将鲜艳的边缘色带，盖在正常玻璃的上方 */}
      <feBlend
        in={`colored_edge_glow_${id}`}
        in2={`displaced_${id}`}
        mode='screen'
        result={`glass_with_colored_edges_${id}`}
      />

      {/* 6. 最后，把半透明的物理白光高光叠加在最顶层 */}
      <feBlend
        in={`specular_white_faded_${id}`}
        in2={`glass_with_colored_edges_${id}`}
        mode='screen'
      />
    </filter>
  )

  if (!isMounted) {
    return null
  }

  return filterOnly
    ? (
        content
      )
    : (
      <svg colorInterpolationFilters='sRGB' style={{ display: 'none' }}>
        <defs>{content}</defs>
      </svg>
      )
})
