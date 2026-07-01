// Maps the admin bookings page's status-filter URL values to the DB query
// shape findAllBookings/countAllBookings expect. Single source of truth for
// both src/app/admin/bookings/page.js (the list) and
// src/app/api/bookings/admin-select-all/route.js ("select all" fetch) so the
// two can never drift — "select all in this filter" must always match
// exactly what the filter's own list shows.
export const FILTER_QUERY_MAP = {
  pending:         { status: ['pending'] },
  on_the_way:      { status: ['assigned_pickup', 'assigned_delivery', 'picked_up'], hasDriver: true },
  picked_up:       { status: ['picked_up'], hasDriver: false },
  failed_pickup:   { status: ['failed_pickup'] },
  failed_dropoff:  { status: ['failed_dropoff'] },
  delivered_today: { status: ['delivered'], sinceDate: 'today' },
}

export const VALID_STATUS_FILTERS = Object.keys(FILTER_QUERY_MAP)

// Resolves a filter key to the actual DB query object, materializing
// sinceDate: 'today' into today's midnight (computed fresh each call).
export function resolveFilterQuery(filterKey) {
  const rawQuery = FILTER_QUERY_MAP[filterKey]
  if (!rawQuery) return null
  if (rawQuery.sinceDate !== 'today') return rawQuery
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return { ...rawQuery, sinceDate: d }
}
