import type { RichContentTheme, RichContentFeatures } from './richContent.ts'

export type InlineRichAssets = {
  katexCss: string;
  katexJs: string;
  katexAutoRenderJs: string;
  markdownItJs: string;
}

export type BuildRichContentHtmlInput = {
  content: string;
  theme?: RichContentTheme;
  features?: RichContentFeatures;
  inlineAssets?: InlineRichAssets | null;
}

const MARKDOWN_IT_VERSION = '14.1.0'
const KATEX_VERSION = '0.16.22'
const MERMAID_VERSION = '11.12.1'

export const buildRichContentHtml = ({
  content,
  theme = 'system',
  features,
  inlineAssets,
}: BuildRichContentHtmlInput): string => {
  const cleanContent = (content || '').replace(/<!(?:--|–)[\s\S]*?(?:--|–)>/g, '')
  const serializedContent = JSON.stringify(cleanContent || '*No content available.*')
  const serializedTheme = JSON.stringify(theme)

  const includeKatex = features ? features.hasMath : true
  const includeMermaid = features ? features.hasMermaid : true

  const markdownItScriptTag = inlineAssets
    ? `<!-- markdown-it@${MARKDOWN_IT_VERSION} inlined -->\n  <script>${inlineAssets.markdownItJs}</script>`
    : `<script src="https://cdn.jsdelivr.net/npm/markdown-it@${MARKDOWN_IT_VERSION}/dist/markdown-it.min.js"></script>`

  const katexBlock = !includeKatex
    ? ''
    : (inlineAssets
        ? `<style>${inlineAssets.katexCss}</style>
  <!-- katex@${KATEX_VERSION} inlined -->
  <script defer>${inlineAssets.katexJs}</script>
  <script defer>${inlineAssets.katexAutoRenderJs}</script>`
        : `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css" />
  <script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js"></script>`)

  const mermaidBlock = !includeMermaid
    ? ''
    : `<script defer src="https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js"></script>`

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
  ${katexBlock}
  ${markdownItScriptTag}
  ${mermaidBlock}
  <style>
    :root {
      color-scheme: light dark;
      --bg: #fffaf2;
      --fg: #1f2933;
      --heading: #111827;
      --muted: #697586;
      --border: #eadfce;
      --soft-border: rgba(120, 91, 53, 0.16);
      --code-bg: #111827;
      --code-fg: #f8fafc;
      --inline-code-bg: #fff1d6;
      --inline-code-fg: #a83f14;
      --blockquote-bg: #fff4dc;
      --blockquote-border: #d99a3d;
      --table-head-bg: #fff2d4;
      --link: #1d4ed8;
      --link-bg: rgba(37, 99, 235, 0.08);
      --selection: rgba(217, 154, 61, 0.28);
      --shadow: rgba(76, 54, 28, 0.10);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b1120;
        --fg: #d7deea;
        --heading: #f8fafc;
        --muted: #97a6ba;
        --border: #263246;
        --soft-border: rgba(148, 163, 184, 0.16);
        --inline-code-bg: #1f2937;
        --inline-code-fg: #fbbf24;
        --blockquote-bg: #111827;
        --blockquote-border: #60a5fa;
        --table-head-bg: #121a2b;
        --link: #93c5fd;
        --link-bg: rgba(147, 197, 253, 0.12);
        --selection: rgba(96, 165, 250, 0.28);
        --shadow: rgba(0, 0, 0, 0.22);
      }
    }

    html[data-theme="light"] {
      color-scheme: light;
      --bg: #fffaf2;
      --fg: #1f2933;
      --heading: #111827;
      --muted: #697586;
      --border: #eadfce;
      --soft-border: rgba(120, 91, 53, 0.16);
      --inline-code-bg: #fff1d6;
      --inline-code-fg: #a83f14;
      --blockquote-bg: #fff4dc;
      --blockquote-border: #d99a3d;
      --table-head-bg: #fff2d4;
      --link: #1d4ed8;
      --link-bg: rgba(37, 99, 235, 0.08);
      --selection: rgba(217, 154, 61, 0.28);
      --shadow: rgba(76, 54, 28, 0.10);
    }

    html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #0b1120;
      --fg: #d7deea;
      --heading: #f8fafc;
      --muted: #97a6ba;
      --border: #263246;
      --soft-border: rgba(148, 163, 184, 0.16);
      --inline-code-bg: #1f2937;
      --inline-code-fg: #fbbf24;
      --blockquote-bg: #111827;
      --blockquote-border: #60a5fa;
      --table-head-bg: #121a2b;
      --link: #93c5fd;
      --link-bg: rgba(147, 197, 253, 0.12);
      --selection: rgba(96, 165, 250, 0.28);
      --shadow: rgba(0, 0, 0, 0.22);
    }

    * { box-sizing: border-box; }
    *::selection { background: var(--selection); }

    html {
      background: var(--bg);
      font-size: 17px;
      overflow-x: hidden;
      text-size-adjust: 100%;
      -webkit-text-size-adjust: 100%;
    }

    body {
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
      font-size: 1rem;
      letter-spacing: 0.01em;
      line-height: 1.82;
      margin: 0;
      overflow-x: hidden;
      overflow-wrap: break-word;
      padding: 0 0 28px;
      -webkit-font-smoothing: antialiased;
    }

    #root { width: 100%; }
    #root > *:first-child { margin-top: 0; }
    #root > *:last-child { margin-bottom: 0; }

    p {
      margin: 0 0 1.12rem;
    }

    strong { color: var(--heading); font-weight: 760; }
    em { color: var(--fg); }

    h1, h2, h3, h4, h5, h6 {
      color: var(--heading);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
      font-weight: 800;
      letter-spacing: -0.025em;
      line-height: 1.24;
      margin: 2rem 0 0.82rem;
    }
    h1 { font-size: 1.78rem; }
    h2 {
      border-bottom: 1px solid var(--soft-border);
      font-size: 1.46rem;
      padding-bottom: 0.45rem;
    }
    h3 { font-size: 1.22rem; }
    h4 { font-size: 1.08rem; }

    a {
      background: var(--link-bg);
      border-radius: 0.38rem;
      color: var(--link);
      font-weight: 650;
      padding: 0.03rem 0.24rem;
      text-decoration: none;
    }

    ul, ol {
      margin: 0 0 1.18rem;
      padding-left: 1.35rem;
    }
    li { margin: 0.32rem 0; padding-left: 0.08rem; }
    li::marker { color: var(--muted); }

    hr {
      border: 0;
      border-top: 1px solid var(--soft-border);
      margin: 1.7rem 0;
    }

    img {
      background: var(--border);
      border: 1px solid var(--soft-border);
      border-radius: 18px;
      box-shadow: 0 12px 28px var(--shadow);
      display: block;
      height: auto;
      margin: 1.35rem auto;
      max-width: 100%;
    }

    
      kbd {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 4px;
        box-shadow: 0 1px 1px rgba(0,0,0,0.1);
        color: var(--fg);
        font-family: "Menlo", "Monaco", "Courier New", monospace;
        font-size: 0.85em;
        padding: 2px 4px;
        white-space: nowrap;
      }

      code {
      background: var(--inline-code-bg);
      border: 1px solid var(--soft-border);
      border-radius: 0.42rem;
      color: var(--inline-code-fg);
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.86em;
      padding: 0.12rem 0.34rem;
    }

    pre {
      background: var(--code-bg);
      border-radius: 18px;
      box-shadow: 0 10px 26px var(--shadow);
      color: var(--code-fg);
      font-family: "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.82rem;
      line-height: 1.62;
      margin: 1.25rem 0;
      overflow-x: auto;
      padding: 1rem;
      -webkit-overflow-scrolling: touch;
    }
    pre code {
      background: transparent;
      border: 0;
      color: inherit;
      display: block;
      padding: 0;
      white-space: pre;
    }

    blockquote {
      background: var(--blockquote-bg);
      border: 1px solid var(--soft-border);
      border-left: 4px solid var(--blockquote-border);
      border-radius: 16px;
      color: var(--muted);
      margin: 1.25rem 0;
      padding: 0.9rem 1rem;
    }
    blockquote p:last-child { margin-bottom: 0; }

    table {
      border-collapse: separate;
      border-spacing: 0;
      display: block;
      margin: 1.2rem 0;
      overflow-x: auto;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      color: var(--fg);
      min-width: 7.5rem;
      padding: 0.62rem 0.75rem;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: var(--table-head-bg);
      color: var(--heading);
      font-weight: 760;
    }

    .katex-display {
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0.35rem 0;
      -webkit-overflow-scrolling: touch;
    }

    .mermaid-chart {
      background: var(--blockquote-bg);
      border: 1px solid var(--soft-border);
      border-radius: 18px;
      margin: 1.25rem 0;
      overflow-x: auto;
      padding: 1rem;
      -webkit-overflow-scrolling: touch;
    }
    .render-error {
      color: #ef4444;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <article id="root"></article>
  <script>
    (function () {
      const source = ${serializedContent};
      const theme = ${serializedTheme};
      document.documentElement.dataset.theme = theme === 'system' ? '' : theme;

      const postMessage = (payload) => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };

      const reportHeight = () => {
        const height = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.offsetHeight
        );
        postMessage({ type: 'height', height });
      };

      const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      const renderFallback = (message) => {
        const root = document.getElementById('root');
        root.innerHTML =
          '<pre class="render-error">' + escapeHtml(message) + '</pre>' +
          '<pre><code>' + escapeHtml(source) + '</code></pre>';
        reportHeight();
      };

      const render = async () => {
        const root = document.getElementById('root');
        if (!window.markdownit) {
          renderFallback('Markdown renderer failed to load.');
          return;
        }

        const md = window.markdownit({
          breaks: true,
          html: true,
          linkify: true,
          typographer: true,
        });
        root.innerHTML = md.render(source);

        root.querySelectorAll('a[href]').forEach((anchor) => {
          anchor.addEventListener('click', (event) => {
            event.preventDefault();
            postMessage({ type: 'link', href: anchor.href });
          });
        });

        root.querySelectorAll('img[src]').forEach((image) => {
          image.addEventListener('click', () => {
            postMessage({
              type: 'image',
              src: image.currentSrc || image.src,
              alt: image.getAttribute('alt') || '',
            });
          });
        });

        if (window.renderMathInElement) {
          window.renderMathInElement(root, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
            ],
            throwOnError: false,
          });
        }

        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: theme === 'dark' ? 'dark' : 'neutral',
          });

          const mermaidBlocks = Array.from(root.querySelectorAll('pre > code.language-mermaid'));
          for (let index = 0; index < mermaidBlocks.length; index += 1) {
            const code = mermaidBlocks[index];
            const pre = code.parentElement;
            const diagram = code.textContent || '';
            const id = 'mobile-mermaid-' + index + '-' + Math.random().toString(36).slice(2);
            const wrapper = document.createElement('div');
            wrapper.className = 'mermaid-chart';
            try {
              const result = await window.mermaid.render(id, diagram);
              wrapper.innerHTML = result.svg;
              pre.replaceWith(wrapper);
            } catch (error) {
              wrapper.innerHTML = '<pre class="render-error">' + escapeHtml(error && error.message ? error.message : 'Mermaid diagram failed to render.') + '</pre>';
              pre.replaceWith(wrapper);
            }
          }
        }

        reportHeight();
      };

      const init = () => render().catch((error) => renderFallback(error && error.message ? error.message : 'Rich content failed to render.'));
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, 1);
      } else {
        window.addEventListener('DOMContentLoaded', init);
        window.addEventListener('load', init);
      }

      if (window.ResizeObserver) {
        new ResizeObserver(reportHeight).observe(document.body);
      } else {
        setInterval(reportHeight, 500);
      }
    })();
  </script>
</body>
</html>`
}
