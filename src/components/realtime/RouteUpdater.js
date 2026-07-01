'use client'

import { useEffect, useRef } from 'react'
import { usePusher } from './PusherProvider'

/**
 * RouteUpdater — subscribes to private-driver-{driverId} channel.
 * Calls onRouteUpdate(routeData) when a route:updated event arrives.
 *
 * onRouteUpdate is stored in a ref so the Pusher subscription is created
 * exactly once per driverId and never torn down due to callback identity churn.
 */
export default function RouteUpdater({ driverId, onRouteUpdate }) {
  const pusher = usePusher()
  const callbackRef = useRef(onRouteUpdate)

  // Keep ref current without triggering re-subscription
  useEffect(() => { callbackRef.current = onRouteUpdate }, [onRouteUpdate])

  useEffect(() => {
    if (!pusher || !driverId) return

    const channel = pusher.subscribe(`private-driver-${driverId}`)

    channel.bind('route:updated', (data) => {
      callbackRef.current?.(data)
    })

    channel.bind('pusher:subscription_error', (err) => {
      console.error('[RouteUpdater] subscription error:', err)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-driver-${driverId}`)
    }
  }, [pusher, driverId]) // onRouteUpdate intentionally excluded — accessed via ref

  return null
}
