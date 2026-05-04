import React from 'react'

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

/**
 * Standard container for all subpages to ensure consistent layout and spacing.
 * Handles responsive padding and max-width.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'max-w-[2400px]',
  ...props
}) => {
  return (
    <div
      className={`w-full ${maxWidth} mx-auto px-4 md:px-6 animate-fade-in-up ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
