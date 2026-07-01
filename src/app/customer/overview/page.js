import { requireCustomer } from '@/lib/dal'
import { findBookingsByCustomer } from '@/lib/db/bookings'
import CustomerDashboardClient from './CustomerDashboardClient'

export const metadata = { title: 'Dashboard — Go Fast Delivery' }

export default async function CustomerDashboardPage() {
  const { userId } = await requireCustomer()
  const recent = await findBookingsByCustomer(userId, { limit: 5 })

  return (
    <CustomerDashboardClient
      recentBookings={JSON.parse(JSON.stringify(recent))}
    />
  )
}
