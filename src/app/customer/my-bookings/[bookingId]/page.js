import { notFound } from 'next/navigation'
import { requireCustomer } from '@/lib/dal'
import { findBookingById } from '@/lib/db/bookings'
import BookingDetailClient from './BookingDetailClient'

export const metadata = { title: 'Booking Detail — Go Fast Delivery' }

export default async function CustomerBookingDetailPage({ params }) {
  const { bookingId } = await params
  const { userId } = await requireCustomer()

  const booking = await findBookingById(bookingId, { customerId: userId })
  if (!booking) notFound()

  const origin = process.env.APP_BASE_URL ?? 'http://localhost:3000'

  return (
    <BookingDetailClient
      booking={JSON.parse(JSON.stringify(booking))}
      origin={origin}
    />
  )
}
