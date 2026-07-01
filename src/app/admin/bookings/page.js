import { requireAdmin } from '@/lib/dal'
import { findAllBookings, countAllBookings } from '@/lib/db/bookings'
import { VALID_STATUS_FILTERS, resolveFilterQuery } from '@/lib/bookingStatusFilters'
import AdminBookingsClient from './AdminBookingsClient'

export const metadata = { title: 'Bookings — Courier Admin' }

const PAGE_SIZE = 20

export default async function AdminBookingsPage({ searchParams }) {
  await requireAdmin()
  const sp = await searchParams

  const rawStatus = typeof sp?.status === 'string' ? sp.status : ''
  const statusFilter = VALID_STATUS_FILTERS.includes(rawStatus) ? rawStatus : VALID_STATUS_FILTERS[0]

  const rawPage = parseInt(sp?.page, 10)
  const page = rawPage >= 1 ? rawPage : 1
  const skip = (page - 1) * PAGE_SIZE

  const query = resolveFilterQuery(statusFilter)

  const [bookings, total] = await Promise.all([
    findAllBookings({ ...query, limit: PAGE_SIZE, skip }),
    countAllBookings(query),
  ])

  return (
    <AdminBookingsClient
      initialStatusFilter={statusFilter}
      initialPage={page}
      bookings={JSON.parse(JSON.stringify(bookings))}
      total={total}
      pageSize={PAGE_SIZE}
    />
  )
}
