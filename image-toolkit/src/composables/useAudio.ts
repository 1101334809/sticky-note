/**
 * 操作音效 Composable
 *
 * 使用 Web Audio API 合成短提示音（无需外部音频文件）
 * 通过 settingsStore.soundEnabled 控制开关
 * T-053
 */
import { useSettingsStore } from '../stores/settings.store'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

/** 播放一个合成短音 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const settingsStore = useSettingsStore()
  if (!settingsStore.soundEnabled) return

  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not available, silently ignore
  }
}

export function useAudio() {
  /** 成功提示音 — 上行双音 */
  function playSuccess() {
    playTone(523, 0.12, 'sine', 0.12) // C5
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100) // E5
  }

  /** 错误提示音 — 低沉单音 */
  function playError() {
    playTone(220, 0.2, 'triangle', 0.1) // A3
  }

  /** 删除提示音 — 短促下行 */
  function playDelete() {
    playTone(440, 0.08, 'sine', 0.08)
  }

  /** 完成提示音 — 愉快三音 */
  function playComplete() {
    playTone(523, 0.1, 'sine', 0.1)
    setTimeout(() => playTone(659, 0.1, 'sine', 0.1), 80)
    setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 160)
  }

  return {
    playSuccess,
    playError,
    playDelete,
    playComplete,
  }
}
