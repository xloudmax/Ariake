import { describe, expect, it } from 'vitest'
import rehypeLayoutDirectives, { normalizeRehypeLayoutDirectives } from '@/utils/rehypeLayoutDirectives'

describe('rehypeLayoutDirectives', () => {
  it('wraps the next node with an allowed layout class', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:wrap-class=row-span-2' },
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: 'Featured paragraph' }],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: ['row-span-2'] },
      children: [
        {
          type: 'element',
          tagName: 'p',
          children: [{ type: 'text', value: 'Featured paragraph' }],
        },
      ],
    })
  })

  it('wraps the next node with multiple allowed layout classes used by stored quickref articles', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:wrap-class=col-span-2 row-span-4' },
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: ['col-span-2', 'row-span-4'] },
      children: [{ type: 'element', tagName: 'table' }],
    })
  })

  it('applies allowed className directives to the previous rendered node', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [],
        },
        { type: 'comment', value: 'rehype:className=shortcuts left-align' },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'table',
      properties: { className: ['shortcuts', 'left-align'] },
    })
  })

  it('turns body-class directives into a wrapper around the rendered document', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'h2', properties: {}, children: [] },
        { type: 'comment', value: 'rehype:body-class=cols-2' },
        { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Grid item' }] },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: ['cols-2'] },
      children: [
        { type: 'element', tagName: 'h2' },
        { type: 'element', tagName: 'p' },
      ],
    })
  })

  it('keeps allowed body-class values when the directive also carries a safe style', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:body-class=cols-1&style=display:none;' },
        { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Hidden index' }] },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: ['cols-1'], style: 'display: none;' },
      children: [{ type: 'element', tagName: 'p' }],
    })
  })

  it('applies safe style directives to the next rendered node', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:style=text-align: left;background:green;position:fixed;' },
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'table',
      properties: { style: 'text-align: left; background: green;' },
    })
  })

  it('wraps the next node with a safe wrap-style directive', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:wrap-style=padding-top: 12px;' },
        {
          type: 'element',
          tagName: 'h3',
          properties: {},
          children: [{ type: 'text', value: 'Intro' }],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: [], style: 'padding-top: 12px;' },
      children: [{ type: 'element', tagName: 'h3' }],
    })
  })

  it('does not drop style directives between a wrap directive and its target', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:wrap-class=col-span-2' },
        { type: 'comment', value: 'rehype:style=text-align: left;' },
        {
          type: 'element',
          tagName: 'table',
          properties: {},
          children: [],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { className: ['col-span-2'], style: 'text-align: left;' },
      children: [{ type: 'element', tagName: 'table' }],
    })
  })

  it('drops directives with non-whitelisted classes instead of applying them', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'comment', value: 'rehype:wrap-class=fixed inset-0' },
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [{ type: 'text', value: 'Normal paragraph' }],
        },
      ],
    }

    rehypeLayoutDirectives()(tree)

    expect(tree.children).toHaveLength(1)
    expect(tree.children[0]).toMatchObject({
      type: 'element',
      tagName: 'p',
      children: [{ type: 'text', value: 'Normal paragraph' }],
    })
  })

  it('normalizes malformed en-dash HTML comment markers before markdown parsing', () => {
    expect(normalizeRehypeLayoutDirectives('<!–rehype:wrap-class=row-span-2–>\nContent')).toBe(
      '<!-- rehype:wrap-class=row-span-2 -->\nContent'
    )
  })
})
