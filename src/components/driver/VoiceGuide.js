'use client'

import { useImperativeHandle, forwardRef, useRef, useEffect } from 'react'

/**
 * VoiceGuide — speaks navigation instructions via Web Speech API.
 *
 * Mobile browsers block speechSynthesis until a user gesture has occurred.
 * Call unlock() from any click/tap handler to prime the API, after which
 * speak() works freely — including from GPS/timer callbacks.
 *
 * Exposed methods (via ref):
 *   unlock()          — call once from a user tap to unblock speech on mobile
 *   speak(text)       — speak a string; deduplicates consecutive identical strings
 *   speakStep(step)   — speak a normalized Directions step object (maneuver + distance)
 */
const VoiceGuide = forwardRef(function VoiceGuide(_, ref) {
  const lastSpoken   = useRef(null)
  const unlockedRef  = useRef(false)

  // Chrome Android bug: speechSynthesis pauses after ~15s in background.
  // Keep it alive by resuming on visibilitychange.
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && window.speechSynthesis?.paused) {
        window.speechSynthesis.resume()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useImperativeHandle(ref, () => ({
    unlock() {
      if (unlockedRef.current) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      unlockedRef.current = true
      // Speak a silent utterance to unlock the API
      const u = new SpeechSynthesisUtterance(' ')
      u.volume = 0
      window.speechSynthesis.speak(u)
    },

    speak(text) {
      if (!text || text === lastSpoken.current) return
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      lastSpoken.current = text
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang   = 'en-US'
      u.rate   = 1.05
      u.volume = 1.0
      window.speechSynthesis.speak(u)
    },

    // stage: 'early' | 'main' | 'final'
    // distM: live metres to the turn (from GPS, not step.distance)
    speakStep(step, distM, stage) {
      if (!step) return
      const instruction = step.maneuver?.instruction
      if (!instruction) return

      let text
      if (stage === 'final') {
        // "Turn right now"
        text = `${instruction} now`
      } else if (stage === 'main') {
        // "Turn right"
        text = instruction
      } else {
        // 'early' — "In 500 metres, turn right onto Main Street"
        const d = distM ?? step.distance
        let distText = ''
        if (d >= 1000) distText = `In ${(d / 1000).toFixed(1)} kilometres, `
        else if (d >= 50) distText = `In ${Math.round(d / 10) * 10} metres, `
        text = `${distText}${instruction}`
      }
      this.speak(text)
    },
  }))

  return null
})

export default VoiceGuide
