import React from 'react'
import { Link } from 'react-router-dom'
import { Space } from 'antd'
import { LiquidButton } from '../components/LiquidButton'
import { LoginOutlined, UserAddOutlined, HomeOutlined } from '@ant-design/icons'
import { useAppUser } from '@/hooks'
import { LiquidHero } from '../components/LiquidHero'

const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAppUser()

  return (
    <div className='relative w-full min-h-screen overflow-x-hidden bg-[#0a0a0c] flex flex-col items-center justify-center p-4'>
      {/* Dynamic 3D Hero */}
      <div className='w-full max-w-7xl animate-fade-in'>
        <LiquidHero
          title='C404 LABS'
          subtitle='Explore the futuristic interactions and seamless experience with our Liquid Glass Engine.'
          className='h-[70vh] sm:h-[600px] mb-12 shadow-2xl'
        />
      </div>

      {/* Navigation Buttons */}
      <div className='relative z-20 flex flex-col items-center justify-center text-center animate-slide-up' style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
        <Space size='large' className='flex flex-col sm:flex-row gap-4'>
          <Link to='/home'>
            <LiquidButton
              variant='secondary'
              className='flex items-center justify-center px-10 py-7 text-xl font-bold border border-white/10 rounded-3xl hover:bg-white/5 transition-all duration-500 shadow-2xl backdrop-blur-xl'
              style={{ background: 'rgba(255,255,255,0.03)', color: '#ffffff' }}
            >
              <div className='flex items-center gap-3'>
                <HomeOutlined className='text-xl' />
                <span>Enter Home</span>
              </div>
            </LiquidButton>
          </Link>

          {!isAuthenticated && (
            <>
              <Link to='/login'>
                <LiquidButton
                  variant='secondary'
                  className='flex items-center justify-center px-10 py-7 text-xl font-bold border border-blue-500/30 rounded-3xl hover:bg-blue-500/10 hover:border-blue-500/50 transition-all duration-500 shadow-xl'
                  style={{ background: 'rgba(59, 130, 246, 0.05)', color: '#bfdbfe' }}
                >
                  <div className='flex items-center gap-3'>
                    <LoginOutlined className='text-xl' />
                    <span>Sign In</span>
                  </div>
                </LiquidButton>
              </Link>

              <Link to='/register'>
                <LiquidButton
                  variant='primary'
                  className='flex items-center justify-center px-10 py-7 text-xl font-bold rounded-3xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all duration-500 border-0 overflow-hidden transform hover:-translate-y-1'
                  style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' }}
                >
                  <div className='flex items-center gap-3'>
                    <UserAddOutlined className='text-xl' />
                    <span>Register</span>
                  </div>
                </LiquidButton>
              </Link>
            </>
          )}
        </Space>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}
      </style>
    </div>
  )
}

export default LandingPage
