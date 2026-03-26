export interface VoiceBadgeColors {
  backgroundColor: string
  foregroundColor: string
}

function stringToHash(value: string): number {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash)
    hash |= 0
  }

  return Math.abs(hash)
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const normalizedHue = ((hue % 360) + 360) % 360
  const normalizedSaturation = Math.max(0, Math.min(100, saturation)) / 100
  const normalizedLightness = Math.max(0, Math.min(100, lightness)) / 100

  const chroma = (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation
  const huePrime = normalizedHue / 60
  const intermediate = chroma * (1 - Math.abs((huePrime % 2) - 1))

  let red = 0
  let green = 0
  let blue = 0

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma
    green = intermediate
  } else if (huePrime < 2) {
    red = intermediate
    green = chroma
  } else if (huePrime < 3) {
    green = chroma
    blue = intermediate
  } else if (huePrime < 4) {
    green = intermediate
    blue = chroma
  } else if (huePrime < 5) {
    red = intermediate
    blue = chroma
  } else {
    red = chroma
    blue = intermediate
  }

  const match = normalizedLightness - chroma / 2
  const toHex = (channel: number) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

export function getContrastingTextColor(color: string): string {
  const red = parseInt(color.slice(1, 3), 16)
  const green = parseInt(color.slice(3, 5), 16)
  const blue = parseInt(color.slice(5, 7), 16)
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000

  return yiq >= 150 ? '#111111' : '#ffffff'
}

export function getVoiceBadgeColors(seed: string): VoiceBadgeColors {
  const normalizedSeed = seed.trim() || 'voice'
  const hash = stringToHash(normalizedSeed)
  const hue = hash % 360
  const saturation = 58 + (hash % 14)
  const lightness = 50 + ((hash >> 4) % 8)
  const backgroundColor = hslToHex(hue, saturation, lightness)

  return {
    backgroundColor,
    foregroundColor: getContrastingTextColor(backgroundColor),
  }
}

export function buildVoiceBadgeSeed(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('|')
}
