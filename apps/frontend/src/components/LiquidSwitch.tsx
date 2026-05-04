import React, { InputHTMLAttributes, useState } from 'react'
import { LiquidSwitch as UILiquidSwitch } from './LiquidKit/switch'

export interface LiquidSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'width' | 'height' | 'size' | 'className'> {
  containerClassName?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  scale?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const LiquidSwitch: React.FC<LiquidSwitchProps> = React.memo(({
  containerClassName = '',
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  size = 'md',
  ...rest
}) => {
  const isControlled = checked !== undefined
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isChecked = isControlled ? checked : internalChecked

  const handleCheckedChange = (newValue: boolean) => {
    if (!isControlled) {
      setInternalChecked(newValue)
    }
    onCheckedChange?.(newValue)
  }

  return (
    <div className={`relative inline-flex items-center justify-center pointer-events-none ${containerClassName}`}>
      <div className='pointer-events-auto'>
        <UILiquidSwitch
          checked={isChecked}
          onCheckedChange={handleCheckedChange}
          disabled={disabled}
          size={size}
          refractiveIndex={1.2}
        />
      </div>

      {/* Hidden input for forms */}
      <input
        type='checkbox'
        className='sr-only'
        checked={isChecked}
        disabled={disabled}
        onChange={(e) => handleCheckedChange(e.target.checked)}
        {...rest}
      />
    </div>
  )
})
