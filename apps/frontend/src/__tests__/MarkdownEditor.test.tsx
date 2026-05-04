import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ThemeProvider from '../components/ThemeProvider'
import MarkdownEditor from '../components/MarkdownEditor'

// Mock Liquid components to avoid canvas issues in JSDOM
vi.mock('../components/LiquidButton', () => ({
  LiquidButton: ({ children, onClick, className, variant }: any) => (
    <button
      onClick={onClick}
      className={`${className} ${variant === 'primary' ? 'primary-button' : ''}`}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/LiquidButton', () => ({
  LiquidButton: ({ children, onClick, className, variant }: any) => (
    <button
      onClick={onClick}
      className={`${className} ${variant === 'primary' ? 'primary-button' : ''}`}
    >
      {children}
    </button>
  ),
}))

vi.mock('../components/LiquidKit/filter', () => ({
  LiquidFilter: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/components/LiquidKit/filter', () => ({
  LiquidFilter: ({ children }: any) => <>{children}</>,
}))

// Mock the @uiw/react-md-editor component
vi.mock('@uiw/react-md-editor', () => {
  const MockMDEditor = ({ value, onChange }: { value: string; onChange: (value?: string) => void }) => (
    <textarea
      data-testid='mock-md-editor'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )

  MockMDEditor.Markdown = ({ source }: { source: string }) => (
    <div data-testid='markdown-preview'>{source}</div>
  )

  return {
    default: MockMDEditor,
  }
})

// Mock Ant Design components
vi.mock('antd', () => ({
  Card: React.forwardRef<HTMLDivElement, any>(({ children, className, styles }, ref) => (
    <div ref={ref} className={className} data-testid='card'>
      <div style={styles?.body}>{children}</div>
    </div>
  )),
  Button: ({ children, onClick, loading, icon, type }: any) => (
    <button
      onClick={onClick}
      disabled={loading}
      data-testid='button'
      className={type === 'primary' ? 'primary-button' : ''}
    >
      {icon}
      {children}
    </button>
  ),
  Space: ({ children }: any) => <div data-testid='space'>{children}</div>,
  Tooltip: ({ children, title }: any) => (
    <div data-testid='tooltip' title={title}>{children}</div>
  ),
  App: {
    useApp: () => ({
      modal: {
        confirm: vi.fn((config) => {
          // Create a mock modal element
          const modalElement = document.createElement('div')
          modalElement.innerHTML = `
            <div>
              <h4>${config.title}</h4>
              <p>${config.content}</p>
              <button onclick="this.parentElement.remove(); config.onOk && config.onOk()">${config.okText}</button>
              <button onclick="this.parentElement.remove()">${config.cancelText}</button>
            </div>
          `
          document.body.appendChild(modalElement)

          // Simulate immediate confirmation for testing
          if (config.onOk) {
            setTimeout(() => config.onOk(), 0)
          }
        }),
      },
      notification: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
      },
    }),
  },
  notification: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  Modal: {
    confirm: vi.fn(),
  },
}))

// Mock Ant Design icons
vi.mock('@ant-design/icons', () => ({
  SaveOutlined: () => <span data-testid='save-icon'>Save</span>,
  EyeOutlined: () => <span data-testid='eye-icon'>Eye</span>,
  FullscreenOutlined: () => <span data-testid='fullscreen-icon'>Fullscreen</span>,
  FullscreenExitOutlined: () => <span data-testid='fullscreen-exit-icon'>Exit Fullscreen</span>,
  HistoryOutlined: () => <span data-testid='history-icon'>History</span>,
  CheckCircleOutlined: () => <span data-testid='check-circle-icon'>Check</span>,
  ExclamationCircleOutlined: () => <span data-testid='exclamation-circle-icon'>!</span>,
}))

describe('MarkdownEditor Component Tests', () => {
  const mockOnSave = vi.fn()

  const renderWithTheme = (component: React.ReactNode) => {
    return render(
      <ThemeProvider>
        {component}
      </ThemeProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      value: null,
    })
    Object.defineProperty(document, 'exitFullscreen', {
      writable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render with initial value', () => {
    const initialValue = '# Hello World'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    const editor = screen.getByTestId('mock-md-editor')
    expect(editor).toBeInTheDocument()
    expect((editor as HTMLTextAreaElement).value).toBe(initialValue)
  })

  it('should update value when editor content changes', () => {
    const initialValue = '# Hello World'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: '# Updated Content' } })

    expect((editor as HTMLTextAreaElement).value).toBe('# Updated Content')
  })

  it('should show dirty state when content changes', () => {
    const initialValue = '# Hello World'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Initially should not be dirty
    expect(screen.queryByText('● 有未保存的更改')).not.toBeInTheDocument()

    // Change content
    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: '# Updated Content' } })

    // Should show dirty state
    expect(screen.getByText('● 有未保存的更改')).toBeInTheDocument()
  })

  it('should call onSave when save button is clicked', async () => {
    const initialValue = '# Hello World'
    const updatedValue = '# Updated Content'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Change content
    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: updatedValue } })

    // Click save button
    const saveButton = screen.getByText('保存').closest('button')!
    fireEvent.click(saveButton)

    // Wait for the modal confirm to be called and onSave to be triggered
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(updatedValue)
    })
  })

  it('should show success message after saving', async () => {
    const initialValue = '# Hello World'
    const updatedValue = '# Updated Content'

    mockOnSave.mockResolvedValueOnce(undefined)

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Change content
    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: updatedValue } })

    // Click save button (use the primary button)
    const saveButtons = screen.getAllByText('保存')
    const primarySaveButton = saveButtons.find(btn =>
      btn.closest('button')?.classList.contains('primary-button')
    )?.closest('button')

    expect(primarySaveButton).toBeTruthy()
    fireEvent.click(primarySaveButton!)

    // Wait for save to complete and success message to show
    await waitFor(() => {
      expect(screen.getByText(/已保存/)).toBeInTheDocument()
    })
  })

  it('should handle save error', async () => {
    const initialValue = '# Hello World'
    const updatedValue = '# Updated Content'

    mockOnSave.mockRejectedValueOnce(new Error('Save failed'))

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Change content
    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: updatedValue } })

    // Click save button (use the primary button)
    const saveButtons = screen.getAllByText('保存')
    const primarySaveButton = saveButtons.find(btn =>
      btn.closest('button')?.classList.contains('primary-button')
    )?.closest('button')

    expect(primarySaveButton).toBeTruthy()
    fireEvent.click(primarySaveButton!)

    // Wait for error handling
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(updatedValue)
    })
  })

  it('should handle keyboard shortcut (Ctrl+S)', async () => {
    const initialValue = '# Hello World'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Change content to make it dirty
    const editor = screen.getByTestId('mock-md-editor')
    fireEvent.change(editor, { target: { value: '# Updated Content' } })

    // Simulate Ctrl+S
    fireEvent.keyDown(document, { ctrlKey: true, key: 's' })

    // Should trigger save
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('# Updated Content')
    })
  })

  it('should toggle fullscreen mode', async () => {
    const initialValue = '# Hello World'

    // Mock requestFullscreen
    const mockRequestFullscreen = vi.fn().mockResolvedValue(undefined)
    Element.prototype.requestFullscreen = mockRequestFullscreen

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Click fullscreen button
    const fullscreenButton = screen.getByText('Fullscreen').closest('button')!
    await act(async () => {
      fireEvent.click(fullscreenButton)
    })

    // Should call requestFullscreen
    expect(mockRequestFullscreen).toHaveBeenCalled()
  })

  it('should show character count', () => {
    const initialValue = '# Hello World'

    renderWithTheme(
      <MarkdownEditor initialValue={initialValue} onSave={mockOnSave} />
    )

    // Should show character count
    expect(screen.getByText(`字数: ${initialValue.length}`)).toBeInTheDocument()
  })
})
