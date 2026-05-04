import React, { useState, useEffect, ClassAttributes, HTMLAttributes, ReactNode, lazy, Suspense, useMemo } from 'react'
import ReactMarkdown, { ExtraProps } from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { PluggableList } from 'unified'
import 'github-markdown-css'
import { Card, Image, Grid, Skeleton, Button, Tooltip } from 'antd'
import { CopyOutlined, CheckOutlined } from '@ant-design/icons'
import './MarkdownViewer.css' // 引入自定义样式
import { detectMarkdownFeatures } from '@/utils/markdownFeatures'
import { scheduleIdleTask } from '@/utils/performance'
import { transformStructuredInsightContent } from '@/utils/structuredInsightContent'
import rehypeLayoutDirectives, { normalizeRehypeLayoutDirectives } from '@/utils/rehypeLayoutDirectives'
import RuntimeCodeHighlight from '@/components/RuntimeCodeHighlight'

const MermaidChart = lazy(() => import('./MermaidChart'))

interface MarkdownViewerProps {
  /** Markdown 文本内容 */
  content: string
  mode?: 'markdown' | 'legacy-insight'
}

// 自定义 sanitize schema，允许标题的 id 属性以及 math 相关标签
const customSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'math', 'annotation', 'semantics', 'mrow', 'input', 'span', 'div', 'article'],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'id', 'style'],
    h1: [...(defaultSchema.attributes?.h1 || []), 'id'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'id'],
    h3: [...(defaultSchema.attributes?.h3 || []), 'id'],
    h4: [...(defaultSchema.attributes?.h4 || []), 'id'],
    h5: [...(defaultSchema.attributes?.h5 || []), 'id'],
    h6: [...(defaultSchema.attributes?.h6 || []), 'id'],
  }
}

type CodeProps = ClassAttributes<HTMLElement> & HTMLAttributes<HTMLElement> & ExtraProps & { inline?: boolean; mermaidEnabled?: boolean }

const CodeBlock = ({ children, className, inline, mermaidEnabled, ...props }: CodeProps) => {
  const match = /language-(\w+)/.exec(className || '')
  const lang = match ? match[1] : ''

  if (inline) {
    return <code className={className} {...props}>{children}</code>
  }

  if (lang === 'mermaid' && mermaidEnabled) {
    return (
      <Suspense fallback={<div className='flex justify-center p-4 min-h-[150px]'><Skeleton active /></div>}>
        <MermaidChart code={String(children).trim()} />
      </Suspense>
    )
  }

  // 非 inline 且非 mermaid，内容在 PreBlock 中已包装
  return <code className={className} {...props}>{children}</code>
}

type PreProps = ClassAttributes<HTMLPreElement> & HTMLAttributes<HTMLPreElement> & ExtraProps & {
  codeHighlightEnabled?: boolean;
}

const getTextFromNode = (node: ReactNode): string => {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(getTextFromNode).join('')
  if (React.isValidElement(node)) {
    const props = node.props as { children?: ReactNode }
    if (props.children) return getTextFromNode(props.children)
  }
  return ''
}

const PreBlock = ({ children, codeHighlightEnabled = false }: PreProps) => {
  const [copied, setCopy] = useState(false)

  // 从 children 中安全提取 code 组件的 props
  const codeElement = React.Children.toArray(children).find(
    (child): child is React.ReactElement<{ className?: string; children?: ReactNode; mdxType?: string }> =>
      React.isValidElement(child) && (
        child.type === 'code' ||
                child.type === CodeBlock ||
                (child.props as { mdxType?: string }).mdxType === 'code'
      )
  )

  if (!codeElement) {
    return <pre>{children}</pre>
  }

  const { className, children: codeChildren } = codeElement.props
  const match = /language-(\w+)/.exec(className || '')
  const lang = match ? match[1] : ''
  const codeText = getTextFromNode(codeChildren).replace(/\n$/, '')

  if (lang === 'mermaid') {
    return <>{children}</>
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText)
      .then(() => {
        setCopy(true)
        setTimeout(() => setCopy(false), 2000)
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('Failed to copy text: ', err)
      })
  }

  return (
    <div className='code-block-container group'>
      <div className='code-block-header'>
        <span className='code-block-lang'>{lang.toUpperCase() || 'CODE'}</span>
        <Tooltip title={copied ? 'Copied!' : 'Copy code'}>
          <Button
            type='text'
            size='small'
            icon={copied ? <CheckOutlined className='text-emerald-500' /> : <CopyOutlined />}
            onClick={handleCopy}
            className='code-copy-btn'
          />
        </Tooltip>
      </div>
      <div className='code-block-content'>
        <pre className={className}>
          <RuntimeCodeHighlight
            code={codeText}
            language={lang}
            className={className}
            enabled={codeHighlightEnabled}
          />
        </pre>
      </div>
    </div>
  )
}

// 递归检查子元素是否包含块级组件
const hasBlockElement = (children: ReactNode): boolean => {
  return React.Children.toArray(children).some((child) => {
    if (!child || !React.isValidElement(child)) return false

    // 检查当前元素是否是 Image, PreBlock 或 MermaidChart
    if (child.type === Image || child.type === PreBlock || child.type === MermaidChart) {
      return true
    }

    // 检查 HTML 标签名 (针对 rehype 处理后的结果)
    const element = child as React.ReactElement<{ node?: { tagName: string }; children?: ReactNode }>
    if (element.props.node?.tagName === 'img' ||
            element.props.node?.tagName === 'pre' ||
            element.props.node?.tagName === 'div') {
      return true
    }

    // 递归检查子元素的子元素 (处理嵌套在 strong, em, a 等标签中的情况)
    if (element.props.children) {
      return hasBlockElement(element.props.children)
    }

    return false
  })
}

export default function MarkdownViewer ({ content, mode = 'markdown' }: MarkdownViewerProps) {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const normalizedContent = useMemo(() => {
    const contentWithNormalizedDirectives = normalizeRehypeLayoutDirectives(content)
    return mode === 'legacy-insight'
      ? transformStructuredInsightContent(contentWithNormalizedDirectives)
      : contentWithNormalizedDirectives
  }, [content, mode])
  const features = useMemo(() => detectMarkdownFeatures(normalizedContent), [normalizedContent])
  const [enhancedState, setEnhancedState] = useState({
    hasCode: false,
    hasMath: false,
    hasMermaid: false,
  })
  const [asyncRemarkPlugins, setAsyncRemarkPlugins] = useState<PluggableList>([remarkGfm])
  const [asyncRehypePlugins, setAsyncRehypePlugins] = useState<PluggableList>([
    rehypeRaw,
    rehypeLayoutDirectives,
    rehypeSlug,
    [rehypeAutolinkHeadings, { behavior: 'append' }],
    [rehypeSanitize, customSchema],
  ])

  useEffect(() => {
    let cancelled = false

    setEnhancedState({
      hasCode: false,
      hasMath: false,
      hasMermaid: false,
    })
    setAsyncRemarkPlugins([remarkGfm])
    setAsyncRehypePlugins([
      rehypeRaw,
      rehypeLayoutDirectives,
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'append' }],
      [rehypeSanitize, customSchema],
    ])

    const cancelIdleTask = scheduleIdleTask(() => {
      const loadEnhancements = async () => {
        const nextRemarkPlugins: PluggableList = [remarkGfm]
        const nextRehypePlugins: PluggableList = [
          rehypeRaw,
          rehypeLayoutDirectives,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'append' }],
          [rehypeSanitize, customSchema],
        ]

        if (features.hasMath) {
          const [{ default: remarkMath }, { default: rehypeKatex }] = await Promise.all([
            import('remark-math'),
            import('rehype-katex'),
          ])
          await import('katex/dist/katex.min.css')
          nextRemarkPlugins.push(remarkMath)
          nextRehypePlugins.push(rehypeKatex)
        }

        if (!cancelled) {
          setEnhancedState({
            hasCode: features.hasCode,
            hasMath: features.hasMath,
            hasMermaid: features.hasMermaid,
          })
          setAsyncRemarkPlugins(nextRemarkPlugins)
          setAsyncRehypePlugins(nextRehypePlugins)
        }
      }

      loadEnhancements().catch(() => {
        if (!cancelled) {
          setEnhancedState({
            hasCode: false,
            hasMath: false,
            hasMermaid: false,
          })
        }
      })
    }, 700)

    return () => {
      cancelled = true
      cancelIdleTask()
    }
  }, [features.hasCode, features.hasMath, features.hasMermaid, normalizedContent])

  const components: Components = useMemo(() => ({
    p: ({ children }: ClassAttributes<HTMLParagraphElement> & HTMLAttributes<HTMLParagraphElement> & ExtraProps) => {
      if (hasBlockElement(children)) {
        return <div className='mb-4'>{children}</div>
      }
      return <p>{children}</p>
    },
    pre: (props) => <PreBlock {...props} codeHighlightEnabled={enhancedState.hasCode} />,
    code: (props) => <CodeBlock {...props} mermaidEnabled={enhancedState.hasMermaid} />,
    img (props: React.ImgHTMLAttributes<HTMLImageElement>) {
      return (
        <Image
          src={props.src}
          alt={props.alt}
          className={props.className}
          loading='lazy'
          decoding='async'
          style={{ borderRadius: '8px', maxWidth: '100%', cursor: 'zoom-in' }}
          placeholder={
            <span className='w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center min-h-[100px] rounded-lg'>
              loading...
            </span>
          }
        />
      )
    }
  }), [enhancedState.hasCode, enhancedState.hasMermaid])

  return (
    <Card
      variant='outlined'
      style={{
        marginTop: isMobile ? '8px' : '16px',
        borderRadius: isMobile ? '16px' : '24px',
        background: 'var(--color-bg-secondary)',
        borderColor: 'var(--color-bg-secondary)',
        boxShadow: '0 4px 24px -1px rgba(0, 0, 0, 0.1)'
      }}
      className='markdown-viewer-card'
      styles={{ body: { padding: isMobile ? '8px' : '32px' } }}
    >
      <article className={`markdown-body w-full prose max-w-none ${isMobile ? 'mobile-prose' : ''}`}>
        <ReactMarkdown
          remarkPlugins={asyncRemarkPlugins}
          rehypePlugins={asyncRehypePlugins}
          components={components}
        >
          {normalizedContent}
        </ReactMarkdown>
      </article>
    </Card>
  )
}
