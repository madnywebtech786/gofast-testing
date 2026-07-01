import { requireAdmin } from '@/lib/dal'
import { findCustomers, countCustomers } from '@/lib/db/users'
import CustomersClient from './CustomersClient'

export const metadata = { title: 'Customers — Go Fast Delivery' }

const PAGE_SIZE = 20

export default async function AdminCustomersPage({ searchParams }) {
  await requireAdmin()
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? '1'))
  const search = params.search ?? ''
  const skip   = (page - 1) * PAGE_SIZE

  const [customers, total] = await Promise.all([
    findCustomers({ search, limit: PAGE_SIZE, skip }),
    countCustomers({ search }),
  ])

  const serialized = JSON.parse(JSON.stringify(customers))

  return (
    <CustomersClient
      customers={serialized}
      total={total}
      page={page}
      search={search}
    />
  )
}
