import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import {
  getAllPricingRules,
  upsertPricingRule,
  bulkUpsertPricingRules,
  deletePricingRule,
} from '@/lib/db/pricing'

export async function GET() {
  try {
    await requireAdmin()
    const rules = await getAllPricingRules()
    return NextResponse.json(JSON.parse(JSON.stringify(rules)))
  } catch (err) {
    return handleApiError(err, '[GET /api/pricing/rules]')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    const body = await request.json()

    // Bulk import from Excel parse: { rows: [...] }
    if (Array.isArray(body.rows)) {
      const valid = body.rows.filter(
        (r) => r.fromCity && r.toCity && r.price != null
      )
      if (valid.length === 0) {
        return NextResponse.json({ error: 'No valid rows found' }, { status: 400 })
      }
      const result = await bulkUpsertPricingRules(valid)
      return NextResponse.json({ imported: valid.length, result: String(result) })
    }

    // Single rule upsert
    const { fromCity, toCity, weightSlab, price } = body
    if (!fromCity || !toCity || price == null) {
      return NextResponse.json({ error: 'fromCity, toCity, and price are required' }, { status: 400 })
    }
    await upsertPricingRule({ fromCity, toCity, weightSlab: weightSlab ?? 'up_to_10', price })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err, '[POST /api/pricing/rules]')
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin()
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await deletePricingRule(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleApiError(err, '[DELETE /api/pricing/rules]')
  }
}
