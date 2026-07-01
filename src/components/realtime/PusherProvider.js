'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'

const PusherContext = createContext(null)

export function usePusher() {
  return useContext(PusherContext)
}

/**
 * PusherProvider — initializes the Pusher client once per page.
 * Wrap driver and receiver layouts with this.
 */
export default function PusherProvider({ children }) {
  const pusherRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    if (!key || !cluster) {
      console.error('Pusher environment variables missing')
      return
    }

    import('pusher-js').then((PusherModule) => {
      const Pusher = PusherModule.default

      const pusher = new Pusher(key, {
        cluster,
        forceTLS: true,
        channelAuthorization: {
          endpoint: '/api/pusher/auth',
          transport: 'ajax',
        },
      })

      pusherRef.current = pusher
      setReady(true)

      // Disconnect when tab is hidden for > 5 minutes (saves Pusher connections)
      let hiddenTimer = null
      function handleVisibilityChange() {
        if (document.hidden) {
          hiddenTimer = setTimeout(() => pusher.disconnect(), 5 * 60 * 1000)
        } else {
          clearTimeout(hiddenTimer)
          if (pusher.connection.state === 'disconnected') pusher.connect()
        }
      }
      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        clearTimeout(hiddenTimer)
        pusher.disconnect()
      }
    })
  }, [])

  return (
    <PusherContext.Provider value={ready ? pusherRef.current : null}>
      {children}
    </PusherContext.Provider>
  )
}
