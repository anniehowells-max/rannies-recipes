import { useEffect, useRef, useState } from 'react'

type Timer = {
  id: number
  totalSeconds: number
  secondsLeft: number
  endTime: number | null   // Date.now() ms target — null when paused/idle
  isRunning: boolean
  isDone: boolean
}

function makeTimer(id: number, seconds = 5 * 60): Timer {
  return { id, totalSeconds: seconds, secondsLeft: seconds, endTime: null, isRunning: false, isDone: false }
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    // Pleasant ascending chord: C5 E5 G5 C6 — repeated 5 times, 2s apart
    const notes = [523.25, 659.25, 783.99, 1046.5]
    for (let rep = 0; rep < 5; rep++) {
      const repOffset = rep * 2
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        const t = ctx.currentTime + repOffset + i * 0.16
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.22, t + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
        osc.start(t)
        osc.stop(t + 1.4)
      })
    }
  } catch { /* AudioContext may be blocked until user gesture */ }
}

function fireAlert() {
  playChime()
  navigator.vibrate?.([500, 200, 500, 200, 500, 200, 500])
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

type Props = { onClose: () => void }

export default function FloatingTimer({ onClose }: Props) {
  const [timers, setTimers] = useState<Timer[]>([makeTimer(1)])
  const [nextId, setNextId] = useState(2)
  const [pos, setPos] = useState(() => ({
    x: Math.max(12, window.innerWidth - 268),
    y: Math.max(80, window.innerHeight - 360),
  }))
  const [snapping, setSnapping] = useState(false)
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set())

  const timersRef = useRef(timers)
  useEffect(() => { timersRef.current = timers }, [timers])

  // Notification timeout IDs keyed by timer id — so we can cancel on pause/reset
  const notifTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 })

  function markDone(timerId: number) {
    fireAlert()
    if (Notification.permission === 'granted') {
      new Notification('Timer done! 🍳', { body: 'Your kitchen timer has finished.', silent: false })
    }
    setFlashIds(f => new Set(f).add(timerId))
    setTimeout(() => setFlashIds(f => { const n = new Set(f); n.delete(timerId); return n }), 4000)
  }

  // Master interval — uses endTime so it self-corrects after tab throttling
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setTimers(prev => prev.map(t => {
        if (!t.isRunning || !t.endTime) return t
        const remaining = Math.max(0, Math.round((t.endTime - now) / 1000))
        if (remaining <= 0) {
          markDone(t.id)
          clearNotification(t.id)
          return { ...t, secondsLeft: 0, isRunning: false, endTime: null, isDone: true }
        }
        return { ...t, secondsLeft: remaining }
      }))
    }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Catch up when the user returns to the tab after the browser throttled the interval
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      setTimers(prev => prev.map(t => {
        if (!t.isRunning || !t.endTime) return t
        const remaining = Math.max(0, Math.round((t.endTime - now) / 1000))
        if (remaining <= 0) {
          markDone(t.id)
          clearNotification(t.id)
          return { ...t, secondsLeft: 0, isRunning: false, endTime: null, isDone: true }
        }
        return { ...t, secondsLeft: remaining }
      }))
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function clearNotification(id: number) {
    if (notifTimeoutsRef.current[id]) {
      clearTimeout(notifTimeoutsRef.current[id])
      delete notifTimeoutsRef.current[id]
    }
  }

  function scheduleNotification(timerId: number, ms: number) {
    clearNotification(timerId)
    if (Notification.permission !== 'granted') return
    notifTimeoutsRef.current[timerId] = setTimeout(() => {
      new Notification('Timer done! 🍳', { body: 'Your kitchen timer has finished.', silent: false })
    }, ms)
  }

  function adjustTime(id: number, deltaSecs: number) {
    setTimers(prev => prev.map(t => {
      if (t.id !== id || t.isRunning) return t
      const next = Math.max(60, t.totalSeconds + deltaSecs)
      return { ...t, totalSeconds: next, secondsLeft: next, isDone: false }
    }))
  }

  function toggleRunning(id: number) {
    setTimers(prev => prev.map(t => {
      if (t.id !== id || t.isDone) return t
      if (t.isRunning) {
        // Pause — cancel pending notification
        clearNotification(id)
        return { ...t, isRunning: false, endTime: null }
      } else {
        // Start — record end timestamp and schedule notification
        const endTime = Date.now() + t.secondsLeft * 1000
        requestNotificationPermission().then(() => scheduleNotification(id, t.secondsLeft * 1000))
        return { ...t, isRunning: true, endTime }
      }
    }))
  }

  function resetTimer(id: number) {
    clearNotification(id)
    setTimers(prev => prev.map(t =>
      t.id === id ? { ...t, secondsLeft: t.totalSeconds, isRunning: false, endTime: null, isDone: false } : t
    ))
    setFlashIds(f => { const n = new Set(f); n.delete(id); return n })
  }

  function removeTimer(id: number) {
    clearNotification(id)
    const remaining = timers.filter(t => t.id !== id)
    if (remaining.length === 0) { onClose(); return }
    setTimers(remaining)
  }

  function addTimer() {
    setTimers(prev => [...prev, makeTimer(nextId)])
    setNextId(n => n + 1)
  }

  // Drag handlers
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
    setSnapping(false)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 256, dragRef.current.origX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy)),
    })
  }

  function onPointerUp() {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    const widgetWidth = 256
    const margin = 12
    const snappedX = pos.x + widgetWidth / 2 < window.innerWidth / 2
      ? margin
      : window.innerWidth - widgetWidth - margin
    setSnapping(true)
    setPos(p => ({ ...p, x: snappedX }))
  }

  return (
    <div
      style={{
        left: pos.x,
        top: pos.y,
        touchAction: 'none',
        transition: snapping ? 'left 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
      }}
      className="fixed z-50 w-[256px] bg-white rounded-xl border border-stone-100 shadow-xl shadow-stone-300/40 select-none cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onTransitionEnd={() => setSnapping(false)}
    >
      {/* Drawer handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-8 h-[3px] rounded-full bg-stone-200" />
      </div>

      {/* Timer rows */}
      <div className="px-3.5 pb-1 flex flex-col gap-2.5">
        {timers.map(timer => {
          const isFlashing = flashIds.has(timer.id)
          const isAmber = timer.isRunning || (timer.isDone && isFlashing)
          return (
            <div
              key={timer.id}
              className={`rounded-lg px-3.5 py-3 transition-colors duration-300 ${isFlashing ? 'bg-amber-50' : 'bg-stone-50'}`}
            >
              {/* Countdown + play/pause */}
              <div className="flex items-center gap-2">
                <span
                  className={`flex-1 font-medium tracking-tight transition-colors duration-300 ${
                    timer.isDone
                      ? isFlashing ? 'text-amber-500' : 'text-amber-400'
                      : isAmber ? 'text-amber-500' : 'text-stone-800'
                  } ${isFlashing ? 'animate-pulse' : ''}`}
                  style={{ fontFamily: 'Lora, Georgia, serif', fontSize: '28px', lineHeight: 1 }}
                >
                  {timer.isDone ? 'done!' : fmt(timer.secondsLeft)}
                </span>

                {/* Play / pause / reset button */}
                <button
                  onClick={() => timer.isDone ? resetTimer(timer.id) : toggleRunning(timer.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    timer.isDone
                      ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                      : timer.isRunning
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-stone-900 text-white hover:bg-stone-700'
                  }`}
                >
                  {timer.isDone ? (
                    <svg viewBox="0 0 12 12" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 6a5 5 0 1 0 .9-2.9"/><path d="M1 2v2.5h2.5"/>
                    </svg>
                  ) : timer.isRunning ? (
                    <svg viewBox="0 0 12 12" className="w-4 h-4" fill="currentColor">
                      <rect x="2" y="1.5" width="2.8" height="9" rx="0.7"/>
                      <rect x="7.2" y="1.5" width="2.8" height="9" rx="0.7"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 12 12" className="w-4 h-4" fill="currentColor">
                      <path d="M2.5 1.8l7.5 4.2-7.5 4.2V1.8z"/>
                    </svg>
                  )}
                </button>

                {/* Remove (only when multiple timers) */}
                {timers.length > 1 && (
                  <button
                    onClick={() => removeTimer(timer.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors text-base leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Adjust time */}
              {!timer.isDone && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {([[-300, '−5m'], [-60, '−1m'], [60, '+1m'], [300, '+5m']] as [number, string][]).map(([d, label]) => (
                    <button
                      key={label}
                      onClick={() => adjustTime(timer.id, d)}
                      disabled={timer.isRunning}
                      className="w-12 h-12 rounded-full font-ui text-[11px] tracking-wide bg-white border-2 border-stone-200 hover:border-stone-400 hover:bg-stone-50 text-stone-500 disabled:opacity-30 transition-colors flex items-center justify-center flex-shrink-0"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        {timers.length < 2 ? (
          <button
            onClick={addTimer}
            className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
          >
            + add timer
          </button>
        ) : <span />}
        <button
          onClick={onClose}
          className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
        >
          close
        </button>
      </div>
    </div>
  )
}
