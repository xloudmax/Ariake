import React, { useState, useRef, useCallback, useEffect, useId } from 'react'
import { useLiquidMagnifierGUI } from '@/hooks/useLiquidMagnifierGUI'

export interface LiquidMagnifierProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  bezelRatio?: number;
  scale?: number;
  ior?: number;
  specular?: number;
  className?: string;
  initialX?: number;
  initialY?: number;
}

export const LiquidMagnifier: React.FC<LiquidMagnifierProps> = React.memo(({
  width = 160,
  height = 64, // 同步 BottomBar 的 h-16 (64px)
  borderRadius = 32, // 圆角同步
  className = '',
  initialX = 0,
  initialY = 0,
}) => {
  const rawId = useId()
  const filterId = rawId.replace(/:/g, '') // 确保严格清洗冒号

  const lensRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const [refractionMapUrl, setRefractionMapUrl] = useState('')
  const [zoomMapUrl, setZoomMapUrl] = useState('')
  const [specularMapUrl, setSpecularMapUrl] = useState('') // 新增高光蒙版状态

  // 引入 GUI 调参面板
  const guiConfig = useLiquidMagnifierGUI({
    refractionLevel: 1.00,
    specularOpacity: 0.50,
    specularSaturation: 9,
    edgeDistortion: 2,
    edgeRadius: 0.7,
    zoomStrength: 50,
    zoomRadius: 0.8,
    scale1: 12,
    scale2: 25,
    brightness: 1.1,
    blur: 0,
  }, 'Liquid Magnifier')

  // --- 高精度物理映射生成 ---
  const generateMaps = useCallback(() => {
    if (typeof document === 'undefined') return

    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const imgData = ctx.createImageData(128, 128)

    // 1. 生成边缘折射图 (Fresnel Distortion)
    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const idx = (i * 128 + j) * 4
        const nx = (j / 128) * 2 - 1
        const ny = (i / 128) * 2 - 1
        const dist = Math.sqrt(nx * nx + ny * ny)

        // 使用 GUI 参数控制边缘畸变
        const val = Math.pow(Math.max(0, dist - guiConfig.edgeRadius), 2) * guiConfig.edgeDistortion
        imgData.data[idx] = 128 + nx * val * 127
        imgData.data[idx + 1] = 128 + ny * val * 127
        imgData.data[idx + 2] = 128
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
    setRefractionMapUrl(canvas.toDataURL())

    // 2. 生成中心放大图 (Magnification)
    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const idx = (i * 128 + j) * 4
        const nx = (j / 128) * 2 - 1
        const ny = (i / 128) * 2 - 1
        const dist = Math.sqrt(nx * nx + ny * ny)

        // 使用 GUI 参数控制中心放大
        const zoom = Math.max(0, 1 - dist * guiConfig.zoomRadius)
        imgData.data[idx] = 128 - nx * zoom * guiConfig.zoomStrength
        imgData.data[idx + 1] = 128 - ny * zoom * guiConfig.zoomStrength
        imgData.data[idx + 2] = 128
        imgData.data[idx + 3] = 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
    setZoomMapUrl(canvas.toDataURL())

    // 3. 生成高光隔离蒙版 (Specular Mask)
    for (let i = 0; i < 128; i++) {
      for (let j = 0; j < 128; j++) {
        const idx = (i * 128 + j) * 4
        const nx = (j / 128) * 2 - 1
        const ny = (i / 128) * 2 - 1
        const dist = Math.sqrt(nx * nx + ny * ny)

        // 边缘区域完全不透明，中心透明
        // dist 越接近 1（边缘），maskAlpha 越接近 1
        const maskAlpha = Math.max(0, Math.min(1, (dist - guiConfig.edgeRadius) / (1 - guiConfig.edgeRadius)))
        imgData.data[idx] = 255
        imgData.data[idx + 1] = 255
        imgData.data[idx + 2] = 255
        imgData.data[idx + 3] = maskAlpha * 255
      }
    }
    ctx.putImageData(imgData, 0, 0)
    setSpecularMapUrl(canvas.toDataURL())
  }, [guiConfig.edgeDistortion, guiConfig.edgeRadius, guiConfig.zoomStrength, guiConfig.zoomRadius])

  useEffect(() => { generateMaps() }, [generateMaps])

  // --- 交互逻辑 ---

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }, [pos])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const parentRect = lensRef.current?.parentElement?.getBoundingClientRect()
    if (!parentRect) return

    // 严格限制在父容器高度内，确保不会上下抖动
    const newX = Math.max(0, Math.min(parentRect.width - width, e.clientX - dragOffset.current.x))
    const newY = Math.max(0, Math.min(parentRect.height - height, e.clientY - dragOffset.current.y))
    setPos({ x: newX, y: newY })
  }, [isDragging, width, height])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  const filterUrl = refractionMapUrl && zoomMapUrl && specularMapUrl
    ? `url(#magnifier-combined-${filterId})` + (guiConfig.blur > 0 ? ` blur(${guiConfig.blur}px)` : '')
    : 'none'

  return (
    <>
      <div
        ref={lensRef}
        className={`absolute cursor-grab active:cursor-grabbing ${className}`}
        style={{
          left: pos.x,
          top: pos.y,
          width,
          height,
          borderRadius,
          backdropFilter: filterUrl,
          WebkitBackdropFilter: filterUrl, // 确保兼容性
          background: 'rgba(255,255,255,0.01)',
          boxShadow: isDragging
            ? '0 15px 35px rgba(0,0,0,0.3)'
            : '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: isDragging ? 100 : 10,
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* 物理厚度边框 (移除有害的内部 backdropFilter) */}
        <div
          className='absolute inset-0 pointer-events-none rounded-[inherit]'
          style={{
            border: '1px solid rgba(255,255,255,0.25)',
            boxShadow: `
              inset 0 2px 6px rgba(255,255,255,0.4), 
              inset 0 -2px 8px rgba(0,0,0,0.15),
              inset 0 0 0 1.5px rgba(255,255,255,0.05)
            `
          }}
        />

        {/* 菲涅耳边缘亮环 (Rim Light - 确保 -webkit- 前缀) */}
        <div
          className='absolute inset-0 pointer-events-none rounded-[inherit]'
          style={{
            WebkitMaskImage: 'radial-gradient(circle at center, transparent 65%, black 100%)', // 必须在前
            maskImage: 'radial-gradient(circle at center, transparent 65%, black 100%)',
            background: `rgba(255,255,255,${guiConfig.specularOpacity * 0.5})`,
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* SVG 物理滤镜节点 */}
      {refractionMapUrl && zoomMapUrl && specularMapUrl && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id={`magnifier-combined-${filterId}`} colorInterpolationFilters='sRGB'>
              {/* 1. 边缘折射 */}
              <feImage href={refractionMapUrl} result='refrMap' preserveAspectRatio='none' />
              <feDisplacementMap in='SourceGraphic' in2='refrMap' scale={guiConfig.scale1 * guiConfig.refractionLevel} xChannelSelector='R' yChannelSelector='G' result='magnified_source' />

              {/* 可选的抗锯齿微模糊 */}
              <feGaussianBlur in='magnified_source' stdDeviation='0' result='blurred_source' />

              {/* 2. 中心放大 */}
              <feImage href={zoomMapUrl} result='zoomMap' preserveAspectRatio='none' />
              <feDisplacementMap in='blurred_source' in2='zoomMap' scale={guiConfig.scale2 * guiConfig.refractionLevel} xChannelSelector='R' yChannelSelector='G' result='displaced' />

              {/* 3. 生成极度鲜艳的图层用于边缘 */}
              <feColorMatrix in='displaced' type='saturate' result='displaced_saturated' values={guiConfig.specularSaturation.toString()} />

              {/* 4. 加载边缘高光蒙版 */}
              <feImage href={specularMapUrl} result='specular_layer' preserveAspectRatio='none' />

              {/* 5. 使用蒙版抠出边缘的超高饱和度像素 */}
              <feComposite in='displaced_saturated' in2='specular_layer' operator='in' result='specular_saturated' />

              {/* 6. 处理原本的白光高光透明度 */}
              <feComponentTransfer in='specular_layer' result='specular_faded'>
                <feFuncA type='linear' slope={guiConfig.specularOpacity} />
              </feComponentTransfer>

              {/* 7. 合并：先叠加上饱和度极高的边缘 */}
              <feBlend in='specular_saturated' in2='displaced' mode='screen' result='withSaturation' />

              {/* 8. 最后合并白光高光 */}
              <feBlend in='specular_faded' in2='withSaturation' mode='screen' />

              {/* 9. 整体曝光控制 */}
              <feComponentTransfer>
                <feFuncR type='linear' slope={guiConfig.brightness} />
                <feFuncG type='linear' slope={guiConfig.brightness} />
                <feFuncB type='linear' slope={guiConfig.brightness} />
              </feComponentTransfer>
            </filter>
          </defs>
        </svg>
      )}
    </>
  )
})
