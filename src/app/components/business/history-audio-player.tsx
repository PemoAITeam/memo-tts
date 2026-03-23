import { useEffect, useRef, useState } from 'react'
import { FaPause, FaPlay } from 'react-icons/fa'

import { Button } from '@/app/components/ui/button'
import { Slider } from '@/app/components/ui/slider'
import { useToast } from '@/app/components/ui/use-toast'
import { cn } from '@/app/lib/utils'
import { useTranslation } from 'react-i18next'

interface HistoryAudioPlayerProps {
  src: string
  autoplayToken?: number
  className?: string
}

function formatPlayerTime(time: number) {
  if (!Number.isFinite(time) || time < 0) {
    return '00:00'
  }

  const totalSeconds = Math.floor(time)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const HistoryAudioPlayer = ({ src, autoplayToken, className }: HistoryAudioPlayerProps) => {
  const { t } = useTranslation()
  const { toast } = useToast()
  const audioRef = useRef<HTMLAudioElement>(null)
  const lastAutoplayTokenRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seekingTime, setSeekingTime] = useState<number | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const syncDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }

    const handleLoadedMetadata = () => {
      syncDuration()
      setCurrentTime(audio.currentTime || 0)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      audio.currentTime = 0
      setCurrentTime(0)
      setIsPlaying(false)
    }

    const handleError = () => {
      setIsPlaying(false)
      toast({
        variant: 'destructive',
        description: t('history.play fail', { defaultValue: '音频播放失败' }),
      })
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [t, toast])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setSeekingTime(null)
  }, [src])

  useEffect(() => {
    if (!autoplayToken || lastAutoplayTokenRef.current === autoplayToken) {
      return
    }

    const audio = audioRef.current
    if (!audio) {
      return
    }

    lastAutoplayTokenRef.current = autoplayToken

    const playAudio = async () => {
      try {
        audio.currentTime = 0
        await audio.play()
      } catch (_error) {
        toast({
          variant: 'destructive',
          description: t('history.play fail', { defaultValue: '音频播放失败' }),
        })
      }
    }

    if (audio.readyState >= 1) {
      void playAudio()
      return
    }

    const handleLoadedMetadata = () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      void playAudio()
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [autoplayToken, t, toast])

  const togglePlayback = async () => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    if (audio.paused) {
      try {
        await audio.play()
      } catch (_error) {
        toast({
          variant: 'destructive',
          description: t('history.play fail', { defaultValue: '音频播放失败' }),
        })
      }
      return
    }

    audio.pause()
  }

  const jumpPlayback = (delta: number) => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const maxDuration = Number.isFinite(audio.duration) ? audio.duration : duration
    const nextTime = Math.min(Math.max(audio.currentTime + delta, 0), maxDuration || 0)
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    setSeekingTime(null)
  }

  const handleSeekChange = (value: number[]) => {
    setSeekingTime(value[0] ?? 0)
  }

  const handleSeekCommit = (value: number[]) => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const nextTime = value[0] ?? 0
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
    setSeekingTime(null)
  }

  const progressValue = seekingTime ?? currentTime

  return (
    <div className={cn('mr-3 mt-4', className)}>
      <audio ref={audioRef} className='audioRef' preload='metadata' src={src} />
      <div className='relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--background))_48%,hsl(var(--muted)/0.85)_100%)] p-4 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)]'>
        <div className='pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-primary/10 blur-3xl' />
        <div className='pointer-events-none absolute left-10 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl' />
        <div className='relative flex items-center gap-3'>
          <Button
            type='button'
            variant='ghost'
            className='h-9 w-9 rounded-full border border-border/60 bg-background/70 px-0 text-xs font-semibold shadow-sm hover:bg-background'
            onClick={() => jumpPlayback(-10)}
          >
            -10
          </Button>
          <Button
            type='button'
            className='h-12 w-12 rounded-full shadow-md'
            onClick={togglePlayback}
          >
            {isPlaying ? <FaPause size={16} /> : <FaPlay size={16} className='translate-x-px' />}
          </Button>
          <Button
            type='button'
            variant='ghost'
            className='h-9 w-9 rounded-full border border-border/60 bg-background/70 px-0 text-xs font-semibold shadow-sm hover:bg-background'
            onClick={() => jumpPlayback(10)}
          >
            +10
          </Button>
          <div className='min-w-0 flex-1'>
            <Slider
              value={[progressValue]}
              min={0}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
              aria-label={t('history.playback progress', { defaultValue: '播放进度' })}
              className='history-audio-slider'
            />
            <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
              <span className='font-medium tabular-nums'>{formatPlayerTime(progressValue)}</span>
              <span className='font-medium tabular-nums'>{formatPlayerTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HistoryAudioPlayer
