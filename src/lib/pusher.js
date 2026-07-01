import Pusher from 'pusher'

if (
  !process.env.PUSHER_APP_ID ||
  !process.env.PUSHER_KEY ||
  !process.env.PUSHER_SECRET ||
  !process.env.PUSHER_CLUSTER
) {
  throw new Error('Pusher environment variables are not set')
}

/**
 * Pusher server-side client.
 * Used for triggering events from Route Handlers and Server Actions.
 */
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
})

/**
 * Trigger a route:updated event for a specific driver.
 * @param {string} driverId
 * @param {object} routeData
 */
export async function pushRouteUpdate(driverId, routeData) {
  await pusherServer.trigger(`private-driver-${driverId}`, 'route:updated', routeData)
}

/**
 * Trigger a booking status change event.
 * @param {string} bookingId
 * @param {{ status: string, updatedAt: string, etaSeconds: number|null }} data
 */
export async function pushBookingStatusChange(bookingId, data) {
  await pusherServer.trigger(`private-booking-${bookingId}`, 'booking:status_changed', data)
}
