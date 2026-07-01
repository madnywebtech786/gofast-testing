import { requireCustomer } from '@/lib/dal'
import { findBookingsByCustomer } from '@/lib/db/bookings'
import MyBookingsClient from './MyBookingsClient'

export const metadata = { title: 'My Bookings — Go Fast Delivery' }

export default async function CustomerBookingsPage() {
  const { userId } = await requireCustomer()
  // Only active bookings — delivered/cancelled live in /history
  const ACTIVE = ['pending', 'assigned_pickup', 'picked_up', 'assigned_delivery', 'failed_pickup', 'failed_dropoff']
  const bookings = await findBookingsByCustomer(userId, { limit: 100, statusIn: ACTIVE })

  return (
    <MyBookingsClient bookings={JSON.parse(JSON.stringify(bookings))} />
  )
}
