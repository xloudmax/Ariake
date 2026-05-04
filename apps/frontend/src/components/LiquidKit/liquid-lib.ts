import type { MotionValue } from 'framer-motion'

// --- Types ---
export interface DisplacementData {
  displacementMap: ImageData;
  maximumDisplacement: number;
}

// --- Utils ---
export function getValueOrMotion<T> (val: T | MotionValue<T>): T {
  if (val && typeof val === 'object' && 'get' in val) {
    return (val as MotionValue<T>).get()
  }
  return val as T
}

function smootherstep (edge0: number, edge1: number, x: number): number {
  x = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

// --- Profiles ---

export const CONVEX_CIRCLE = {
  fn: (x: number) => Math.sqrt(1 - Math.pow(1 - x, 2)),
}

export const CONVEX_SQUIRCLE = {
  fn: (x: number) => Math.pow(1 - Math.pow(Math.max(0, 1 - x), 4), 0.25),
}

export const CONCAVE = {
  fn: (x: number) => 1 - Math.sqrt(1 - Math.pow(1 - x, 2)),
}

export const LIP = {
  fn: (x: number) => {
    const cv = CONVEX_CIRCLE.fn(x)
    const cc = CONCAVE.fn(x)
    const t = smootherstep(0, 1, x)
    return cv * (1 - t) + cc * t
  }
}

export const CONVEX = CONVEX_SQUIRCLE

export function getRoundedDistance (x: number, y: number, w: number, h: number, r: number): number {
  const px = Math.abs(x - w / 2) - (w / 2 - r)
  const py = Math.abs(y - h / 2) - (h / 2 - r)
  const dx = Math.max(px, 0)
  const dy = Math.max(py, 0)
  const distToCorner = Math.sqrt(dx * dx + dy * dy)
  const outsideDist = distToCorner - r
  const insideDist = Math.min(Math.max(px, py), 0)
  return -(outsideDist + insideDist)
}

export interface LiquidConfig {
  canvasWidth: number;
  canvasHeight: number;
  glassThickness?: number;
  bezelWidth?: number;
  radius: number;
  bezelHeightFn?: (x: number) => number;
  dpr?: number;
  refractiveIndex?: number;
  objectWidth?: number;
  objectHeight?: number;
}

/**
 * 物理折射模拟：完全遵循文章中的光学原理、表面函数与 SVG 渲染数值限制。
 */
export function getDisplacementData (config: LiquidConfig): DisplacementData | null {
  if (typeof window === 'undefined') return null
  const { canvasWidth, canvasHeight, glassThickness = 40, bezelWidth = 20, radius, bezelHeightFn = CONVEX.fn, dpr = 1 } = config
  const w = Math.floor(canvasWidth * dpr)
  const h = Math.floor(canvasHeight * dpr)
  const r = radius * dpr
  const b = bezelWidth * dpr
  // 1. 物理光学数值：折射率 (Refractive Index)
  const n1 = 1.0 // 空气
  const n2 = config.refractiveIndex || 1.5 // 玻璃材质折射率

  if (w <= 0 || h <= 0) return null

  const data = new Uint8ClampedArray(w * h * 4)
  let maxDispMagnitude = 0

  const displacements = new Float32Array(w * h * 2)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 2
      const dist = getRoundedDistance(x, y, w, h, r)

      // 如果在玻璃外部或在完全平坦的中心（表面与光线正交）
      if (dist <= 0 || dist >= b) {
        displacements[idx] = 0
        displacements[idx + 1] = 0
        continue
      }

      // 计算朝向中心的梯度向量 (Gradient direction towards center)
      const distR = getRoundedDistance(x + 1, y, w, h, r)
      const distL = getRoundedDistance(x - 1, y, w, h, r)
      const distD = getRoundedDistance(x, y + 1, w, h, r)
      const distU = getRoundedDistance(x, y - 1, w, h, r)

      let dirX = (distR - distL) / 2
      let dirY = (distD - distU) / 2
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1
      dirX /= len
      dirY /= len

      // 2. 几何建模数值：表面函数导数
      const normDist = dist / b
      const delta = 0.001
      const nd1 = Math.max(0, normDist - delta)
      const nd2 = Math.min(1, normDist + delta)
      const y1 = bezelHeightFn(nd1)
      const y2 = bezelHeightFn(nd2)

      // 表面斜率 = 高度变化 / 距离变化
      const derivative = (y2 - y1) / (nd2 - nd1)
      const physicalSlope = derivative * (glassThickness / b)

      // 入射角 theta1
      const theta1 = Math.atan(physicalSlope)

      // 斯涅尔定律 (Snell's Law): n1 * sin(theta1) = n2 * sin(theta2)
      const theta2 = Math.asin((n1 * Math.sin(theta1)) / n2)

      // 偏折角
      const alpha = theta1 - theta2

      // 位移距离 = 当前点厚度 * tan(偏折角)
      const heightAtPoint = bezelHeightFn(normDist) * glassThickness
      const dispMagnitude = heightAtPoint * Math.tan(alpha)

      // 凸面会将光线向中心折射（汇聚），所以我们取正向梯度（指向中心）
      const dispX = dirX * dispMagnitude
      const dispY = dirY * dispMagnitude

      displacements[idx] = dispX
      displacements[idx + 1] = dispY

      if (dispMagnitude > maxDispMagnitude) {
        maxDispMagnitude = dispMagnitude
      }
    }
  }

  // 3. SVG 渲染数值：置换映射 (Displacement Map)
  // 根据 SVG 规范，<feDisplacementMap> 的实际偏移是 scale * (color - 0.5)
  // 为了让 0 和 255 对应真正的 maxDispMagnitude，我们需要将 scale 传给 SVG 时翻倍，或者在这里做映射。
  // 文章中的逻辑是将 maxDispMagnitude 作为 scale。所以颜色映射的 127 对应的是完整的 maxDispMagnitude。
  // 这意味着 SVG 层面最终位移会被减半，所以我们将输出的 scale 修正为真实的 2 倍。
  const svgScale = maxDispMagnitude * 2 || 1

  if (maxDispMagnitude === 0) {
    data.fill(128)
    for (let i = 0; i < w * h; i++) {
        data[i * 4 + 3] = 255
    }
    return { displacementMap: new ImageData(data, w, h), maximumDisplacement: 0 }
  }

  for (let i = 0; i < w * h; i++) {
    const dIdx = i * 2
    const cIdx = i * 4

    // 128 是绝对的中性偏移值。
    data[cIdx] = 128 + (displacements[dIdx] / maxDispMagnitude) * 127
    data[cIdx + 1] = 128 + (displacements[dIdx + 1] / maxDispMagnitude) * 127
    data[cIdx + 2] = 128
    data[cIdx + 3] = 255
  }

  return {
    displacementMap: new ImageData(data, w, h),
    maximumDisplacement: svgScale,
  }
}

/**
 * 光照数值：镜面高光 (Specular Highlight)
 */
export function calculateRefractionSpecular (
  width: number,
  height: number,
  radius: number,
  intensity: number = 50,
  bezelWidth: number = 20,
  dpr: number = 1
): ImageData | null {
  if (typeof window === 'undefined') return null
  const w = Math.floor(width * dpr)
  const h = Math.floor(height * dpr)
  const r = radius * dpr
  const b = bezelWidth * dpr
  const lightDir = { x: -0.707, y: -0.707 } // 假设左上角打光

  if (w <= 0 || h <= 0) return null
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const dist = getRoundedDistance(x, y, w, h, r)
      if (dist > b || dist < 0) continue

      const distL = getRoundedDistance(x - 1, y, w, h, r)
      const distR = getRoundedDistance(x + 1, y, w, h, r)
      const distU = getRoundedDistance(x, y - 1, w, h, r)
      const distD = getRoundedDistance(x, y + 1, w, h, r)
      const nx = (distR - distL) / 2
      const ny = (distD - distU) / 2
      const len = Math.sqrt(nx * nx + ny * ny) || 0.001

      // 法线角度与虚拟光照方向的相对关系
      const dot = (nx / len) * lightDir.x + (ny / len) * lightDir.y
      const cosTheta = Math.abs(ny / len)

      // Fresnel 效应：边缘反射更强
      const fresnel = Math.pow(1.0 - cosTheta, 3)
      const edgeMask = Math.pow(1 - dist / b, 1.5)
      const val = Math.max(0, dot) * edgeMask * (1.0 + fresnel * 2.0)

      // 高光强度 (Intensity)
      const finalAlpha = Math.min(255, val * 255 * (intensity / 100))
      data[idx] = 255
      data[idx + 1] = 255
      data[idx + 2] = 255
      data[idx + 3] = finalAlpha
    }
  }
  return new ImageData(data, w, h)
}
