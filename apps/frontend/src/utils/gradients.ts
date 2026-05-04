export const HERO_GRADIENTS = [
  // Premium App Store Style Gradients
  'linear-gradient(135deg, #00C6FB 0%, #005BEA 100%)', // Blue Ocean
  'linear-gradient(135deg, #F5576C 0%, #F093FB 100%)', // Pink Purple
  'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)', // Cyan
  'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)', // Sea Green
  'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', // Orange Pink
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Deep Purple
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', // Sky Blue
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Soft Purple
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Sunset
  'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Mint Blue
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Soft Lavender
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', // Candy
]

/**
 * Returns a deterministic random gradient based on the input string (hash).
 */
export const getGradientByString = (str: string): string => {
  if (!str) return HERO_GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return HERO_GRADIENTS[Math.abs(hash) % HERO_GRADIENTS.length]
}
