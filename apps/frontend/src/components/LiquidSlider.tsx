import React, { useState } from 'react'
import { LiquidSlider as UILiquidSlider } from './LiquidKit/slider'

export interface LiquidSliderProps {
  containerClassName?: string;
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  width?: number | string;
  height?: number | string;
  scale?: number;
}

export const LiquidSlider: React.FC<LiquidSliderProps> = React.memo(({
  containerClassName = '',
  value,
  defaultValue = 50,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  width = 300,
  height = 40,
  scale = 20,
}) => {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = (newValue: number) => {
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const numWidth = typeof width === 'number' ? width : parseInt(width as string) || 300
  const numHeight = typeof height === 'number' ? height : parseInt(height as string) || 40

  return (
    <div className={`relative inline-flex items-center justify-center transition-transform duration-200 hover:scale-[1.02] ${containerClassName}`}>
      <UILiquidSlider
        value={currentValue}
        onValueChange={handleValueChange}
        min={min}
        max={max}
        step={step}
        slider={{ width: numWidth, height: numHeight }}
        thumb={{ width: numHeight, height: numHeight }}
        glassThickness={scale}
      />
    </div>
  )
})
