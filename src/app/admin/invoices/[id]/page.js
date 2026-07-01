import { requireAdmin } from '@/lib/dal'
import { findInvoiceById } from '@/lib/db/invoices'
import { notFound } from 'next/navigation'
import InvoiceDetailClient from './InvoiceDetailClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  const invoice = await findInvoiceById(id)
  if (!invoice) return { title: 'Invoice Not Found' }
  return { title: `Invoice ${invoice.invoiceNumber} — Go Fast Delivery` }
}

export default async function AdminInvoiceDetailPage({ params }) {
  await requireAdmin()
  const { id } = await params
  const invoice = await findInvoiceById(id)
  if (!invoice) notFound()

  return <InvoiceDetailClient invoice={JSON.parse(JSON.stringify(invoice))} />
}
