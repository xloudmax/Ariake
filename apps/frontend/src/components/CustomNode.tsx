import { memo, useState } from 'react'
import { Handle, Position, NodeProps, Node as FlowNode } from '@xyflow/react'
import {
  RocketOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined,
  CompassOutlined,
  BulbOutlined,
  ExperimentOutlined
} from '@ant-design/icons'
import { Tag } from 'antd'
import { MechanismNodeData, AnalogicalCue } from '../types'

// Community Color Palette (Glassy soft colors)
const COMMUNITY_COLORS: Record<number, string> = {
  0: 'border-blue-500/50 bg-blue-500/5',
  1: 'border-purple-500/50 bg-purple-500/5',
  2: 'border-emerald-500/50 bg-emerald-500/5',
  3: 'border-amber-500/50 bg-amber-500/5',
  4: 'border-rose-500/50 bg-rose-500/5',
  5: 'border-cyan-500/50 bg-cyan-500/5',
  6: 'border-indigo-500/50 bg-indigo-500/5',
  7: 'border-orange-500/50 bg-orange-500/5',
}

const DOMAIN_STYLES: Record<string, { color: string, icon: React.ReactNode }> = {
  Close: { color: 'blue', icon: <DeploymentUnitOutlined /> },
  'Somewhat Far': { color: 'purple', icon: <ArrowsAltOutlined /> },
  Distant: { color: 'emerald', icon: <ExperimentOutlined /> },
}

const CustomNode = ({ data }: NodeProps<FlowNode<MechanismNodeData>>) => {
  const [expanded, setExpanded] = useState(false)
  const isRoot = data.isRoot
  const isMechanism = data.isMechanism
  const communityId = typeof data.communityId === 'number' ? data.communityId : null
  const applications = data.applications || []
  const matchReasons = Array.isArray(data.matchReasons) ? data.matchReasons : []
  const sourcePostIds = Array.isArray(data.sourcePostIds) ? data.sourcePostIds : []

  // Dynamic styles based on node type
  let bgClass = 'bg-white/80 dark:bg-slate-800/80'
  let borderClass = 'border-slate-200 dark:border-slate-700'
  let textClass = 'text-slate-700 dark:text-slate-200'
  let icon = <BuildOutlined />

  if (isRoot) {
    bgClass = 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-500/30'
    borderClass = 'border-transparent'
    textClass = 'text-white'
    icon = <RocketOutlined />
  } else if (communityId !== null) {
    // Apply community-specific color
    const colorStyle = COMMUNITY_COLORS[communityId % 8]
    bgClass = colorStyle.split(' ')[1] + ' backdrop-blur-md'
    borderClass = colorStyle.split(' ')[0]
    textClass = 'text-slate-800 dark:text-slate-100'
  } else if (isMechanism) {
    bgClass = 'bg-white dark:bg-slate-800 border-l-4 border-l-indigo-500'
    textClass = 'text-slate-800 dark:text-slate-100'
    icon = <DeploymentUnitOutlined className='text-indigo-500 dark:text-indigo-400' />
  }

  return (
    <div className={`
      relative min-w-[260px] max-w-[320px] px-4 py-3 rounded-xl shadow-lg transition-all duration-300
      hover:shadow-xl ${!expanded ? 'hover:scale-105' : ''} backdrop-blur-md
      border ${borderClass} ${bgClass}
    `}
    >
      {/* Input Handle */}
      {!isRoot && (
        <Handle
          type='target'
          position={Position.Top}
          className='!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !-top-1.5'
        />
      )}

      {/* Content */}
      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between gap-2 mb-1'>
          <div className='flex items-center gap-2'>
            <span className={`text-lg opacity-80 ${isRoot ? 'text-white' : ''} `}>
              {icon}
            </span>
            <div className={`font-bold text-sm leading-tight ${textClass}`}>
              {data.title as string}
            </div>
          </div>
          {applications.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className={`
                    p-1 rounded-md transition-colors
                    ${isRoot
                      ? 'hover:bg-white/20 text-white/70'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400'}
                  `}
            >
              {expanded ? <ShrinkOutlined /> : <ArrowsAltOutlined />}
            </button>
          )}
        </div>

        {!!data.active_ingredient && (
          <div className={`
            text-xs mt-1 pt-2 border-t flex items-start gap-1
            ${isRoot ? 'border-white/20 text-indigo-100' : 'border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 italic'}
          `}
          >
            <span className='opacity-70 not-italic'>💡</span>
            <span>{String(data.active_ingredient || '')}</span>
          </div>
        )}

        {!isRoot && (
          <div className='mt-2 rounded-lg border border-slate-200/70 bg-slate-50/70 px-2.5 py-2 text-[10px] leading-relaxed text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/40 dark:text-slate-300'>
            <div className='flex flex-wrap items-center gap-2'>
              {typeof data.seedScore === 'number' && <span>Seed {data.seedScore.toFixed(2)}</span>}
              {typeof data.pathStrength === 'number' && <span>Path {data.pathStrength.toFixed(2)}</span>}
              {typeof data.score === 'number' && <span>Score {data.score.toFixed(2)}</span>}
            </div>
            {matchReasons.length > 0 && (
              <div className='mt-1'>
                命中原因: {matchReasons.join(' / ')}
              </div>
            )}
            {sourcePostIds.length > 0 && (
              <div className='mt-1 truncate'>
                来源文章: {sourcePostIds.slice(0, 2).join(' / ')}
              </div>
            )}
          </div>
        )}

        {/* Analogical Cues Section */}
        {expanded && applications.length > 0 && (
          <div className='mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300'>
            <div className='text-[10px] uppercase tracking-wider font-bold mb-2 opacity-50 flex items-center gap-1'>
              <BulbOutlined /> Analogical Cues
            </div>
            <div className='flex flex-col gap-3'>
              {applications.map((app: AnalogicalCue, idx: number) => {
                const style = DOMAIN_STYLES[app.domain] || DOMAIN_STYLES['Close']
                return (
                  <div key={idx} className='group'>
                    <div className='flex items-center gap-1.5 mb-1'>
                      <Tag color={style.color} className='!m-0 !px-1.5 !py-0 text-[9px] uppercase font-bold border-none bg-opacity-10'>
                        {app.domain}
                      </Tag>
                      <span className='text-[10px] opacity-60 flex items-center gap-0.5'>
                        <CompassOutlined size={10} /> {app.context}
                      </span>
                    </div>
                    <div className='text-[11px] font-medium leading-normal mb-1'>
                      {app.example}
                    </div>
                    <div className='text-[10px] leading-relaxed opacity-80 pl-2 border-l-2 border-slate-200 dark:border-slate-600 py-0.5'>
                      <span className='font-bold text-indigo-500 dark:text-indigo-400 mr-1'>Strategy:</span>
                      {app.strategy}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type='source'
        position={Position.Bottom}
        className='!w-3 !h-3 !bg-slate-400 dark:!bg-slate-500 !-bottom-1.5'
      />
    </div>
  )
}

export default memo(CustomNode)
