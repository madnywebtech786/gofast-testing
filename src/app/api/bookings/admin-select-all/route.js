import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findAllBookingsLean } from '@/lib/db/bookings'
import { VALID_STATUS_FILTERS, resolveFilterQuery } from '@/lib/bookingStatusFilters'

/**
 * GET /api/bookings/admin-select-all?status=<filterKey>
 *
 * Returns every booking matching the given admin status-filter key (the same
 * keys the bookings list page uses — 'pending', 'on_the_way', etc. — NOT a
 * raw booking status), with a lean projection (no full package/contact
 * details). Used by the "select all" header checkbox on the admin bookings
 * page so it can select every booking matching the current filter, not just
 * the ones on the current page.
 */
export async function GET(request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const filterKey = searchParams.get('status') ?? ''

    if (!VALID_STATUS_FILTERS.includes(filterKey)) {
      return NextResponse.json({ error: `Invalid status filter '${filterKey}'` }, { status: 400 })
    }

    const query = resolveFilterQuery(filterKey)
    const bookings = await findAllBookingsLean(query)

    return NextResponse.json(JSON.parse(JSON.stringify(bookings)))
  } catch (err) {
    return handleApiError(err, '[GET /api/bookings/admin-select-all]')
  }
}
