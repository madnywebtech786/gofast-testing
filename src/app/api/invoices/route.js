import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { createInvoice, findAllInvoices, countAllInvoices, INVOICE_STATUSES } from '@/lib/db/invoices'

export async function GET(request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') ?? ''
    const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit  = 20
    const skip   = (page - 1) * limit

    const [invoices, total] = await Promise.all([
      findAllInvoices({ search, status, limit, skip }),
      countAllInvoices({ search, status }),
    ])

    return NextResponse.json({
      invoices: JSON.parse(JSON.stringify(invoices)),
      total,
      page,
      pageSize: limit,
    })
  } catch (err) {
    return handleApiError(err, '[GET /api/invoices]')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    let body
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!body.invoiceNumber?.trim()) {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 })
    }
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }
    if (!body.clientEmail?.trim()) {
      return NextResponse.json({ error: 'Client email is required' }, { status: 400 })
    }
    const invoice = await createInvoice(body)
    return NextResponse.json(JSON.parse(JSON.stringify(invoice)), { status: 201 })
  } catch (err) {
    if (err?.code === 11000 || err?.name === 'MongoServerError' && err?.message?.includes('invoiceNumber')) {
      return NextResponse.json({ error: 'Invoice number already exists. Please use a unique invoice number.' }, { status: 400 })
    }
    return handleApiError(err, '[POST /api/invoices]')
  }
}
