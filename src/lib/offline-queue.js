'use client'

/**
 * Client-side durable action queue.
 *
 * Used for driver actions that MUST not be lost when connectivity drops
 * (currently: stop-complete). Actions are persisted to localStorage so
 * reloads, tab crashes, or OS kills can't silently discard them.
 *
 * Design choices:
 *   - Each action has a stable `idempotencyKey` so the server can safely
 *     accept retries (stop-complete endpoint guards on completedAt=null).
 *   - Exponential backoff on failure, capped at 30s between retries.
 *   - Flushes automatically on `online` event and on visibility change.
 *   - A subscribe() API lets UI render a "Syncing…" pill when anything is
 *     pending.
 */

const STORAGE_KEY = 'gfd:offline-queue:v1'
const MAX_BACKOFF = 30_000
const MIN_BACKOFF = 1_000

let memoryQueue = null  // lazy-loaded from localStorage
const listeners  = new Set()
let flushTimer   = null
let flushing     = false

function load() {
  if (memoryQueue) return memoryQueue
  if (typeof window === 'undefined') { memoryQueue = []; return memoryQueue }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    memoryQueue = raw ? JSON.parse(raw) : []
  } catch {
    memoryQueue = []
  }
  return memoryQueue
}

function save() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryQueue))
  } catch { /* quota exceeded — swallow */ }
  notify()
}

function notify() {
  const depth = memoryQueue?.length ?? 0
  listeners.forEach((fn) => { try { fn(depth) } catch { /* ignore */ } })
}

export function subscribeQueue(fn) {
  listeners.add(fn)
  fn((load() ?? []).length)
  return () => listeners.delete(fn)
}

/**
 * Enqueue a POST request. Returns the item's idempotencyKey so the caller
 * can optimistically reflect it in the UI.
 */
export function enqueue({ url, body, idempotencyKey, label }) {
  const queue = load()
  const key = idempotencyKey ?? `${url}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
  queue.push({
    key,
    url,
    body,
    label:       label ?? url,
    createdAt:   Date.now(),
    attempts:    0,
    nextAttempt: Date.now(),
  })
  save()
  scheduleFlush(0)
  return key
}

function scheduleFlush(delay) {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null }
  flushTimer = setTimeout(flush, Math.max(0, delay))
}

async function flush() {
  flushTimer = null
  if (flushing) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    // Wait for the 'online' event listener to wake us
    return
  }
  const queue = load()
  if (queue.length === 0) return

  flushing = true
  try {
    // Process one item at a time to preserve order
    const item = queue[0]
    if (Date.now() < item.nextAttempt) {
      scheduleFlush(item.nextAttempt - Date.now())
      return
    }

    try {
      const res = await fetch(item.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': item.key,
        },
        body: JSON.stringify(item.body),
      })
      if (res.ok) {
        queue.shift()
        save()
        scheduleFlush(0)
        return
      }
      // 4xx (not 408/429) — non-retryable; drop to avoid an infinite loop
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        console.warn(`[offline-queue] dropping non-retryable ${item.label} (${res.status})`)
        queue.shift()
        save()
        scheduleFlush(0)
        return
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      item.attempts += 1
      const backoff = Math.min(MAX_BACKOFF, MIN_BACKOFF * 2 ** (item.attempts - 1))
      item.nextAttempt = Date.now() + backoff
      save()
      scheduleFlush(backoff)
    }
  } finally {
    flushing = false
  }
}

// ── Global listeners (registered once per tab) ───────────────────────────────
if (typeof window !== 'undefined' && !window.__gfdQueueWired) {
  window.__gfdQueueWired = true
  window.addEventListener('online',           () => scheduleFlush(0))
  window.addEventListener('focus',            () => scheduleFlush(0))
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleFlush(0)
  })
  // Kick the queue on load in case we have leftover items from a previous session
  scheduleFlush(500)
}
