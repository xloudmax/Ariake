type HastNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const allowedWrapClasses = new Set([
  'col-span-2',
  'col-span-3',
  'col-span-4',
  'row-span-1',
  'row-span-2',
  'row-span-3',
  'row-span-4',
  'row-span-5',
  'row-span-10',
])

const allowedNodeClasses = new Set([
  'left-align',
  'shortcuts',
  'show-header',
  'style-list',
  'style-list-arrow',
  'style-none',
  'style-round',
  'style-timeline',
  'wrap-text',
])

const allowedBodyClasses = new Set([
  'cols-1',
  'cols-2',
  'cols-3',
  'cols-4',
  'cols-5',
])

const allowedStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'color',
  'display',
  'padding',
  'padding-top',
  'text-align',
])

const directivePattern = /^\s*rehype:([a-z-]+)=([\s\S]+?)\s*$/i
const malformedCommentPattern = /<!–\s*(rehype:[a-z-]+=[\s\S]+?)\s*–>/gi

export const normalizeRehypeLayoutDirectives = (content: string) =>
  content.replace(malformedCommentPattern, '<!-- $1 -->')

const getPrimaryValue = (value: string) => value.split('&')[0]

const getParamValue = (value: string, paramName: string) => {
  const params = value.split('&').slice(1)
  const paramPrefix = `${paramName}=`
  return params.find((param) => param.startsWith(paramPrefix))?.slice(paramPrefix.length) || ''
}

const getAllowedClasses = (value: string, allowedClasses: Set<string>) =>
  getPrimaryValue(value)
    .trim()
    .split(/\s+/)
    .filter((className) => allowedClasses.has(className))

const getAllowedStyle = (value: string) => {
  const declarations = value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separatorIndex = declaration.indexOf(':')
      if (separatorIndex === -1) return null

      const property = declaration.slice(0, separatorIndex).trim().toLowerCase()
      const propertyValue = declaration.slice(separatorIndex + 1).trim()

      if (!allowedStyleProperties.has(property)) return null
      if (!/^[a-z0-9#().,%\s-]+$/i.test(propertyValue)) return null
      if (/url|expression|javascript/i.test(propertyValue)) return null

      return `${property}: ${propertyValue}`
    })
    .filter((declaration): declaration is string => Boolean(declaration))

  return declarations.length > 0 ? `${declarations.join('; ')};` : ''
}

const getDirective = (node: HastNode) => {
  if (node.type !== 'comment' || typeof node.value !== 'string') return null

  const match = directivePattern.exec(node.value)
  if (!match) return null

  const [, directiveName, rawValue] = match
  if (directiveName === 'wrap-class') {
    return {
      name: directiveName,
      classes: getAllowedClasses(rawValue, allowedWrapClasses),
      style: getAllowedStyle(getParamValue(rawValue, 'style')),
    }
  }

  if (directiveName === 'className') {
    return {
      name: directiveName,
      classes: getAllowedClasses(rawValue, allowedNodeClasses),
    }
  }

  if (directiveName === 'body-class') {
    return {
      name: directiveName,
      classes: getAllowedClasses(rawValue, allowedBodyClasses),
      style: getAllowedStyle(getParamValue(rawValue, 'style')),
    }
  }

  if (directiveName === 'style' || directiveName === 'wrap-style') {
    return {
      name: directiveName,
      classes: [],
      style: getAllowedStyle(rawValue),
    }
  }

  return null
}

const isIgnorableWhitespace = (node: HastNode) =>
  node.type === 'text' && typeof node.value === 'string' && node.value.trim() === ''

const findNextWrappableNodeIndex = (children: HastNode[], startIndex: number) => {
  for (let index = startIndex; index < children.length; index += 1) {
    const child = children[index]
    if (isIgnorableWhitespace(child)) continue
    if (child.type === 'comment') continue
    return index
  }

  return -1
}

const findPreviousElementIndex = (children: HastNode[], startIndex: number) => {
  for (let index = startIndex; index >= 0; index -= 1) {
    const child = children[index]
    if (isIgnorableWhitespace(child)) continue
    if (child.type === 'comment') continue
    return child.type === 'element' ? index : -1
  }

  return -1
}

const addClasses = (node: HastNode, classNames: string[]) => {
  node.properties = node.properties || {}
  const existingClassName = node.properties.className
  const existingClasses = Array.isArray(existingClassName)
    ? existingClassName.filter((className): className is string => typeof className === 'string')
    : typeof existingClassName === 'string'
      ? existingClassName.split(/\s+/).filter(Boolean)
      : []

  node.properties.className = [...new Set([...existingClasses, ...classNames])]
}

const addStyle = (node: HastNode, style: string) => {
  if (!style) return

  node.properties = node.properties || {}
  const existingStyle = typeof node.properties.style === 'string' ? node.properties.style.trim() : ''
  node.properties.style = existingStyle
    ? `${existingStyle.replace(/;?\s*$/, ';')} ${style}`
    : style
}

const wrapLayoutDirectives = (children: HastNode[]) => {
  const bodyDirectives = {
    classes: [] as string[],
    styles: [] as string[],
  }

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]

    if (child.children) {
      wrapLayoutDirectives(child.children)
    }

    if (child.type !== 'comment') continue

    const directive = getDirective(child)
    if (directive?.name === 'className') {
      const targetIndex = findPreviousElementIndex(children, index - 1)
      if (directive.classes.length > 0 && targetIndex !== -1) {
        addClasses(children[targetIndex], directive.classes)
      }

      children.splice(index, 1)
      index -= 1
      continue
    }

    if (directive?.name === 'body-class') {
      bodyDirectives.classes.push(...directive.classes)
      if (directive.style) {
        bodyDirectives.styles.push(directive.style)
      }
      children.splice(index, 1)
      index -= 1
      continue
    }

    if (directive?.name === 'style') {
      const nextElementIndex = findNextWrappableNodeIndex(children, index + 1)
      const previousElementIndex = findPreviousElementIndex(children, index - 1)
      const targetIndex = nextElementIndex !== -1 ? nextElementIndex : previousElementIndex
      if (directive.style && targetIndex !== -1) {
        addStyle(children[targetIndex], directive.style)
      }

      children.splice(index, 1)
      index -= 1
      continue
    }

    const targetIndex = findNextWrappableNodeIndex(children, index + 1)

    if (
      (directive?.name !== 'wrap-class' && directive?.name !== 'wrap-style') ||
      (directive.classes.length === 0 && !directive.style) ||
      targetIndex === -1
    ) {
      children.splice(index, 1)
      index -= 1
      continue
    }

    const target = children[targetIndex]
    const wrapper: HastNode = {
      type: 'element',
      tagName: 'div',
      properties: { className: directive.classes },
      children: [target],
    }
    if (directive.style) {
      addStyle(wrapper, directive.style)
    }

    children.splice(targetIndex, 1, wrapper)
    children.splice(index, 1)
    index -= 1
  }

  return bodyDirectives
}

export default function rehypeLayoutDirectives () {
  return (tree: HastNode) => {
    if (tree.children) {
      const bodyDirectives = wrapLayoutDirectives(tree.children)
      if (bodyDirectives.classes.length > 0 || bodyDirectives.styles.length > 0) {
        tree.children = [
          {
            type: 'element',
            tagName: 'div',
            properties: {
              className: [...new Set(bodyDirectives.classes)],
              style: bodyDirectives.styles.join(' '),
            },
            children: tree.children,
          },
        ]
      }
    }
  }
}
