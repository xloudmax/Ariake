import React, { useEffect, useMemo, useState } from 'react'
import { scheduleIdleTask } from '@/utils/performance'

interface RuntimeCodeHighlightProps {
  code: string;
  language?: string;
  className?: string;
  enabled?: boolean;
}

type HighlightCore = {
  registerLanguage: (name: string, syntax: unknown) => void;
  highlight: (code: string, options: { language: string; ignoreIllegals?: boolean }) => { value: string };
  getLanguage: (name: string) => unknown;
}

const languageAliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  py: 'python',
  golang: 'go',
  rs: 'rust',
  md: 'markdown',
  cxx: 'cpp',
  'c++': 'cpp',
  plaintext: 'text',
}

const languageLoaders: Record<string, () => Promise<{ default: unknown }>> = {
  bash: () => import('highlight.js/lib/languages/bash'),
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  json: () => import('highlight.js/lib/languages/json'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  python: () => import('highlight.js/lib/languages/python'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  java: () => import('highlight.js/lib/languages/java'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  c: () => import('highlight.js/lib/languages/c'),
  sql: () => import('highlight.js/lib/languages/sql'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  xml: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
}

let corePromise: Promise<HighlightCore> | null = null
const registeredLanguages = new Set<string>()

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const normalizeLanguage = (input?: string) => {
  const normalized = (input || '').trim().toLowerCase()
  if (!normalized) return ''
  return languageAliases[normalized] || normalized
}

const getCore = async () => {
  if (!corePromise) {
    corePromise = import('highlight.js/lib/core').then((mod) => mod.default as unknown as HighlightCore)
  }
  return corePromise
}

const ensureLanguage = async (hljs: HighlightCore, language: string) => {
  if (!language || registeredLanguages.has(language)) return
  const loader = languageLoaders[language]
  if (!loader) return
  const mod = await loader()
  hljs.registerLanguage(language, mod.default)
  registeredLanguages.add(language)
}

const RuntimeCodeHighlight: React.FC<RuntimeCodeHighlightProps> = ({
  code,
  language,
  className,
  enabled = true,
}) => {
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const normalizedLanguage = useMemo(() => normalizeLanguage(language), [language])

  useEffect(() => {
    if (!enabled) {
      setHighlightedHtml('')
      return
    }

    const source = code.replace(/\n$/, '')
    let cancelled = false

    const cancelIdleTask = scheduleIdleTask(() => {
      const doHighlight = async () => {
        const hljs = await getCore()
        await ensureLanguage(hljs, normalizedLanguage)

        if (cancelled) return

        if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
          const value = hljs.highlight(source, {
            language: normalizedLanguage,
            ignoreIllegals: true,
          }).value
          setHighlightedHtml(value)
          return
        }

        setHighlightedHtml(escapeHtml(source))
      }

      doHighlight().catch(() => {
        if (!cancelled) {
          setHighlightedHtml(escapeHtml(source))
        }
      })
    }, 500)

    return () => {
      cancelled = true
      cancelIdleTask()
    }
  }, [code, enabled, normalizedLanguage])

  if (!enabled) {
    return <code className={className}>{code}</code>
  }

  if (!highlightedHtml) {
    return <code className={className}>{code}</code>
  }

  return <code className={className} dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
}

export default RuntimeCodeHighlight
