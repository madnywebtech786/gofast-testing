import { requireAdmin } from '@/lib/dal'
import { findAllInvoices, countAllInvoices } from '@/lib/db/invoices'
import InvoicesClient from './InvoicesClient'

export const metadata = { title: 'Invoices — Go Fast Delivery' }

const PAGE_SIZE = 20

export default async function AdminInvoicesPage({ searchParams }) {
  await requireAdmin()
  const params  = await searchParams
  const page    = Math.max(1, parseInt(params.page ?? '1'))
  const search  = params.search ?? ''
  const status  = params.status ?? ''
  const skip    = (page - 1) * PAGE_SIZE

  const [invoices, total] = await Promise.all([
    findAllInvoices({ search, status, limit: PAGE_SIZE, skip }),
    countAllInvoices({ search, status }),
  ])

  return (
    <InvoicesClient
      initialInvoices={JSON.parse(JSON.stringify(invoices))}
      total={total}
      currentPage={page}
      currentSearch={search}
      currentStatus={status}
    />
  )
}
