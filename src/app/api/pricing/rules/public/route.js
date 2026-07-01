import { NextResponse } from 'next/server'
import { verifySession, handleApiError } from '@/lib/dal'
import { getAllPricingRules } from '@/lib/db/pricing'

/**
 * GET /api/pricing/rules/public
 *
 * Returns all pricing rules for authenticated customers to use
 * for client-side price lookup — no admin role required.
 * Only exposes fields needed for matching and display.
 */
export async function GET() {
  try {
    await verifySession()
    const rules = await getAllPricingRules()

    // Strip internal fields — only expose what the client needs
    const safe = rules.map((r) => ({
      fromCity:        r.fromCity,
      toCity:          r.toCity,
      weightSlab:      r.weightSlab,
      fromCityDisplay: r.fromCityDisplay,
      toCityDisplay:   r.toCityDisplay,
      price:           r.price,
    }))

    return NextResponse.json(safe, {
      headers: {
        // Cache for 5 minutes in the browser — pricing rarely changes mid-session
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    return handleApiError(err, '[GET /api/pricing/rules/public]')
  }
}
