import { normalizeTTSMarkConfig } from '@/app/lib/tts-mention/tts-mark'

export interface TextSegment {
  text: string
  speed?: number | null
  emotion?: string | null
  config?: Record<string, any> | null
  voiceConfig?: Record<string, any> | null
}

export function parseTTSMentionConfig(config: unknown): Record<string, any> | null {
  if (!config) {
    return null
  }

  if (typeof config === 'string') {
    try {
      return JSON.parse(config)
    } catch (error) {
      console.warn('Failed to parse ttsMention config:', error)
      return null
    }
  }

  if (typeof config === 'object') {
    return config as Record<string, any>
  }

  return null
}

export function getActiveTTSMentionValueBeforeOffset(node: any, targetOffset: number) {
  if (!node || typeof node.childCount !== 'number' || typeof targetOffset !== 'number') {
    return null
  }

  let currentVoiceConfig: Record<string, any> | null = null
  let currentOffset = 0

  for (let index = 0; index < node.childCount; index++) {
    if (currentOffset >= targetOffset) {
      break
    }

    const child = node.child(index)
    if (child?.type?.name === 'ttsMention') {
      currentVoiceConfig = parseTTSMentionConfig(child.attrs?.config)
    }

    currentOffset += child?.nodeSize || 0
  }

  return currentVoiceConfig
}

function mergeSegmentConfig(
  inheritedConfig?: Record<string, any> | null,
  markConfig?: Record<string, any> | null,
) {
  const nextConfig = {
    ...(inheritedConfig || {}),
    ...(markConfig || {}),
  }

  return Object.keys(nextConfig).length ? nextConfig : null
}

function isSameSegmentConfig(
  left?: Record<string, any> | null,
  right?: Record<string, any> | null
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function isSameVoiceConfig(
  left?: Record<string, any> | null,
  right?: Record<string, any> | null
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function mergeSegmentsWithVoice(segments: TextSegment[]): TextSegment[] {
  if (segments.length === 0) return []

  const result: TextSegment[] = []
  let current = { ...segments[0] }

  for (let i = 1; i < segments.length; i++) {
    const next = segments[i]

    if (
      current.speed === next.speed
      && current.emotion === next.emotion
      && isSameSegmentConfig(current.config, next.config)
      && isSameVoiceConfig(current.voiceConfig, next.voiceConfig)
    ) {
      current.text += next.text
    } else {
      result.push(current)
      current = { ...next }
    }
  }

  result.push(current)
  return result
}

export function extractTextSegmentsFromNodeWithMentions(node: any): TextSegment[] {
  const segments: TextSegment[] = []

  if (!node?.content || !Array.isArray(node.content)) {
    return segments
  }

  const processContent = (
    content: any[],
    inheritedSpeed?: number | null,
    inheritedEmotion?: string | null,
    inheritedConfig?: Record<string, any> | null,
    inheritedVoiceConfig?: Record<string, any> | null,
  ) => {
    let currentVoiceConfig = inheritedVoiceConfig ?? null

    content.forEach((child: any) => {
      if (child.type === 'ttsMention') {
        currentVoiceConfig = parseTTSMentionConfig(child.attrs?.config)
        return
      }

      const ttsMark = child.marks?.find((mark: any) => mark.type === 'ttsMark')
      const nextSpeed = ttsMark?.attrs?.speed ?? inheritedSpeed ?? null
      const nextEmotion = ttsMark?.attrs?.emotion ?? inheritedEmotion ?? null
      const nextConfig = mergeSegmentConfig(
        inheritedConfig,
        normalizeTTSMarkConfig(ttsMark?.attrs?.config)
      )

      if (child.type === 'text') {
        if (!child.text) {
          return
        }

        segments.push({
          text: child.text,
          speed: nextSpeed,
          emotion: nextEmotion,
          config: nextConfig,
          voiceConfig: currentVoiceConfig,
        })
        return
      }

      if (child.content) {
        processContent(
          child.content,
          nextSpeed,
          nextEmotion,
          nextConfig,
          currentVoiceConfig,
        )
      }
    })
  }

  processContent(node.content)
  return mergeSegmentsWithVoice(segments)
}
