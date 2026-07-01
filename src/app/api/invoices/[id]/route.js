import { NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findInvoiceById, updateInvoice, deleteInvoice } from '@/lib/db/invoices'

export async function GET(request, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const invoice = await findInvoiceById(id)
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    return NextResponse.json(JSON.parse(JSON.stringify(invoice)))
  } catch (err) {
    return handleApiError(err, '[GET /api/invoices/[id]]')
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
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
    const result = await updateInvoice(id, body)
    if (result.matchedCount === 0) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    const updated = await findInvoiceById(id)
    return NextResponse.json(JSON.parse(JSON.stringify(updated)))
  } catch (err) {
    return handleApiError(err, '[PATCH /api/invoices/[id]]')
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAdmin()
    const { id } = await params
    const result = await deleteInvoice(id)
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, '[DELETE /api/invoices/[id]]')
  }
}
