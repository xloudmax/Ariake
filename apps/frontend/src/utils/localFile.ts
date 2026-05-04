// src/utils/localFile.ts
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

const isTauri = typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__

export interface MarkdownContent {
  title: string;
  content: string;
}

export const localFile = {
  /**
   * 从本地选择并读取 Markdown 文件
   */
  async importMarkdown (): Promise<MarkdownContent | null> {
    if (!isTauri) {
      alert('请在桌面客户端中使用此功能')
      return null
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Markdown',
          extensions: ['md', 'markdown', 'txt']
        }]
      })

      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected)
        // 尝试从文件名提取标题
        const fileName = selected.split(/[/]/).pop() || ''
        const title = fileName.replace(/\.[^/.]+$/, '')

        return { title, content }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to import file', e)
    }
    return null
  },

  /**
   * 将内容保存到本地 Markdown 文件
   */
  async exportMarkdown (title: string, content: string): Promise<boolean> {
    if (!isTauri) {
      alert('请在桌面客户端中使用此功能')
      return false
    }

    try {
      const path = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }],
        defaultPath: `${title || 'untitled'}.md`
      })

      if (path) {
        await writeTextFile(path, content)
        return true
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to export file', e)
    }
    return false
  }
}
