// src/test/setup.ts
// 测试环境设置文件

import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock global APIs missing in JSDOM
if (typeof global.ImageData === 'undefined') {
  // @ts-expect-error: ImageData is not defined in JSDOM environment
  global.ImageData = class ImageData {
    data: Uint8ClampedArray
    width: number
    height: number
    constructor (data: Uint8ClampedArray, width: number, height: number) {
      this.data = data
      this.width = width
      this.height = height
    }
  }
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })))
}

// Mock Canvas methods missing in JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  const mockContext = {
    putImageData: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray() }),
    createImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray() }),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    transform: vi.fn(),
    setTransform: vi.fn(),
  }

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mockContext),
  })

  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue('data:image/png;base64,'),
  })
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem (key: string) {
      return store[key] || null
    },
    setItem (key: string, value: string) {
      store[key] = value.toString()
    },
    removeItem (key: string) {
      delete store[key]
    },
    clear () {
      store = {}
    },
    key (index: number) {
      return Object.keys(store)[index] || null
    },
    get length () {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock document.fullscreenElement
Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null,
})

// Mock document.exitFullscreen
Object.defineProperty(document, 'exitFullscreen', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

// Mock Element.requestFullscreen
Element.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined)

// Mock window.ResizeObserver
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

export {}
