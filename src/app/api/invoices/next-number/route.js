import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { getNextInvoiceNumber } from '@/lib/db/invoices'

export async function GET() {
  try {
    await requireAdmin()
    const invoiceNumber = await getNextInvoiceNumber()
    return NextResponse.json({ invoiceNumber })
  } catch (err) {
    return handleApiError(err, '[GET /api/invoices/next-number]')
  }
}
