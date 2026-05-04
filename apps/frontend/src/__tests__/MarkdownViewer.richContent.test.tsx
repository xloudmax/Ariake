import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import MarkdownViewer from '@/components/MarkdownViewer'

vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd')
  return {
    ...actual,
    Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Image: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
    Grid: {
      useBreakpoint: () => ({ md: true }),
    },
    Skeleton: () => <div>loading</div>,
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('MarkdownViewer rich content rendering', () => {
  it('preserves stored quickref layout directives alongside other rich markdown features', () => {
    const { container } = render(
      <MarkdownViewer
        content={`<!--rehype:body-class=cols-2-->
### 快捷键
<!--rehype:wrap-class=col-span-2 row-span-2-->
<!--rehype:style=text-align: left;-->
| Key | Action |
| :- | :- |
| \`Tab\` | Show panel |
<!--rehype:className=shortcuts left-align-->

<details><summary>More</summary><p>Hidden</p></details>

- [x] done
`}
      />
    )

    expect(container.querySelector('.cols-2')).toBeInTheDocument()
    const wrappedTable = container.querySelector('.col-span-2.row-span-2')
    expect(wrappedTable?.querySelector('table')).toBeInTheDocument()
    expect(wrappedTable).toHaveClass('shortcuts', 'left-align')
    expect(wrappedTable).toHaveStyle({ textAlign: 'left' })

    const table = container.querySelector('table')
    expect(table).toBeInTheDocument()

    expect(container.querySelector('details summary')).toHaveTextContent('More')

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
  })
})
