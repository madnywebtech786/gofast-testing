'use client'

import { useEffect } from 'react'
import { usePusher } from './PusherProvider'

/**
 * BookingStatusListener — subscribes to private-booking-{bookingId} channel.
 * Calls onStatusChange({ status, updatedAt, etaSeconds }) on updates.
 * Used by both customer and receiver pages.
 */
export default function BookingStatusListener({ bookingId, onStatusChange }) {
  const pusher = usePusher()

  useEffect(() => {
    if (!pusher || !bookingId) return

    const channel = pusher.subscribe(`private-booking-${bookingId}`)

    channel.bind('booking:status_changed', (data) => {
      onStatusChange?.(data)
    })

    channel.bind('pusher:subscription_error', (err) => {
      console.error('[BookingStatusListener] Channel subscription error:', err)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-booking-${bookingId}`)
    }
  }, [pusher, bookingId, onStatusChange])

  return null
}
