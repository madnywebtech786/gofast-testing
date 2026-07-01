import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findInvoiceById, updateInvoice } from '@/lib/db/invoices'
import { sendInvoiceEmail } from '@/lib/mailer'

export async function POST(request, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const invoice = await findInvoiceById(id)
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (!invoice.clientEmail) {
      return NextResponse.json(
        { error: 'This invoice has no client email address. Edit the invoice and add one before sending.' },
        { status: 400 }
      )
    }
    await sendInvoiceEmail(invoice)
    await updateInvoice(id, { ...invoice, status: 'sent' })
    return NextResponse.json({ success: true, sentTo: invoice.clientEmail })
  } catch (err) {
    console.error('[POST /api/invoices/[id]/send]', err)
    return NextResponse.json({ error: 'Failed to send invoice email. Please try again.' }, { status: 500 })
  }
}
