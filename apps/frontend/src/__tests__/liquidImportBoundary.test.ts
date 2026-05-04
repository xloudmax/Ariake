import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const srcRoot = path.resolve(__dirname, '..')

const allowedPaths = [
  path.join(srcRoot, 'components', 'LiquidKit'),
  path.join(srcRoot, 'components', 'liquid-system'),
  path.join(srcRoot, 'pages', 'LiquidGlassTestPage.tsx'),
]

const disallowedImportPattern = /from\s+['"](?:@\/components\/LiquidKit\/(?:glass|use-liquid-surface)|(?:\.\.?\/)+(?:components\/)?LiquidKit\/(?:glass|use-liquid-surface))['"]/

function walk (dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.backup-')) {
      return []
    }

    const nextPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return walk(nextPath)
    }
    return nextPath
  })
}

describe('liquid engine import boundaries', () => {
  it('keeps the raw liquid engine inside LiquidKit, liquid-system, and the R&D demo', () => {
    const offenders = walk(srcRoot)
      .filter((filePath) => /\.(ts|tsx|js|jsx)$/.test(filePath))
      .filter((filePath) => !/\.test\.(ts|tsx|js|jsx)$/.test(filePath))
      .filter((filePath) => !allowedPaths.some((allowedPath) => filePath === allowedPath || filePath.startsWith(`${allowedPath}${path.sep}`)))
      .flatMap((filePath) => {
        const contents = fs.readFileSync(filePath, 'utf8')
        return disallowedImportPattern.test(contents) ? [path.relative(srcRoot, filePath)] : []
      })

    expect(offenders).toEqual([])
  })
})
