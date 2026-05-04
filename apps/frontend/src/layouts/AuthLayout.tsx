import React, { ReactNode } from 'react'
import { Typography } from 'antd'
import { useTheme } from '../components/ThemeProvider'
import TauriTitleBar from '@/components/TauriTitleBar'
import { CheapGlass } from '@/components/liquid-system'

const { Title, Text } = Typography

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { isDarkMode } = useTheme()

  // Mesh Gradient is now handled by MeshGradientBackground component
  // No CSS background needed efficiently handled by the component

  return (
    <div className='min-h-screen flex items-center justify-center px-4 relative transition-all duration-1000 overflow-hidden'>
      <TauriTitleBar />
      {/* Animated Canvas Background */}

      {/* Entry animation styles */}
      <style>
        {`
          @keyframes fade-in-up {
            0% {
              opacity: 0;
              transform: translateY(30px) scale(0.98);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          .animate-fade-in-up {
            animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      <div className='w-full max-w-md relative z-10 animate-fade-in-up'>
        <CheapGlass
          variant='overlay'
          tone={isDarkMode ? 'inverse' : 'neutral'}
          className='shadow-2xl overflow-hidden'
          style={{
            borderRadius: '32px', // Larger, Apple-like rounded corners
            maxWidth: '420px',
            margin: '0 auto',
            padding: '40px 32px',
          }}
        >
          <div className='text-center mb-10'>
            <Title
              level={2} className='mb-2 tracking-tight text-[color:var(--surface-text)]' style={{
                fontWeight: 700,
                letterSpacing: '-0.5px'
              }}
            >
              {title}
            </Title>
            <Text
              className='text-base font-medium text-[color:var(--surface-text-muted)]'
            >
              {subtitle}
            </Text>
          </div>

          {children}
        </CheapGlass>
      </div>
    </div>
  )
}
