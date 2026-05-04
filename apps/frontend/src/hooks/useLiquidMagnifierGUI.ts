import { useEffect, useState } from 'react'
import * as dat from 'dat.gui'

export interface LiquidMagnifierConfig {
  edgeDistortion: number;
  edgeRadius: number;
  zoomStrength: number;
  zoomRadius: number;
  scale1: number;
  scale2: number;
  brightness: number;
  blur: number;
  specularOpacity: number;
  specularSaturation: number;
  refractionLevel: number;
}

export const useLiquidMagnifierGUI = (initialConfig: LiquidMagnifierConfig, folderName: string = 'Magnifier Settings') => {
  const [config, setConfig] = useState<LiquidMagnifierConfig>(initialConfig)

  useEffect(() => {
    // 确保只在客户端运行
    if (typeof window === 'undefined') return

    // 检查是否已经有 GUI 实例，防止热更新导致重复创建
    // 简单防御，查找 DOM 中是否有 dat.gui 的根节点
    // const existingGui = document.querySelector('.dg.ac');

    const gui = new dat.GUI()
    const folder = gui.addFolder(folderName)
    const proxyConfig = { ...initialConfig }

    const updateConfig = () => {
      setConfig({ ...proxyConfig })
    }

    folder.add(proxyConfig, 'refractionLevel', 0, 3, 0.01).name('Refraction Level').onChange(updateConfig)
    folder.add(proxyConfig, 'specularOpacity', 0, 1, 0.01).name('Specular Opacity').onChange(updateConfig)
    folder.add(proxyConfig, 'specularSaturation', 0, 20, 0.1).name('Specular Saturation').onChange(updateConfig)

    // Existing fine-tuning parameters
    folder.add(proxyConfig, 'edgeDistortion', 0, 10, 0.1).name('Edge Power').onChange(updateConfig)
    folder.add(proxyConfig, 'edgeRadius', 0, 1, 0.01).name('Edge Start (0-1)').onChange(updateConfig)
    folder.add(proxyConfig, 'zoomStrength', 0, 200, 1).name('Zoom Strength').onChange(updateConfig)
    folder.add(proxyConfig, 'zoomRadius', 0, 2, 0.01).name('Zoom Spread').onChange(updateConfig)
    folder.add(proxyConfig, 'scale1', 0, 50, 1).name('Refr Scale').onChange(updateConfig)
    folder.add(proxyConfig, 'scale2', 0, 100, 1).name('Zoom Scale').onChange(updateConfig)
    folder.add(proxyConfig, 'brightness', 0.5, 2.0, 0.01).name('Brightness').onChange(updateConfig)
    folder.add(proxyConfig, 'blur', 0, 10, 0.1).name('CSS Blur').onChange(updateConfig)

    folder.open()

    return () => {
      gui.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return config
}
