import { requireCustomer } from '@/lib/dal'
import { findBookingsByCustomer } from '@/lib/db/bookings'
import HistoryClient from './HistoryClient'

export const metadata = { title: 'Booking History — Go Fast Delivery' }

const HISTORY_STATUSES = ['delivered', 'cancelled', 'failed_pickup', 'failed_dropoff']

export default async function BookingHistoryPage() {
  const { userId } = await requireCustomer()
  const bookings = await findBookingsByCustomer(userId, { limit: 100, statusIn: HISTORY_STATUSES })

  return (
    <HistoryClient bookings={JSON.parse(JSON.stringify(bookings))} />
  )
}
