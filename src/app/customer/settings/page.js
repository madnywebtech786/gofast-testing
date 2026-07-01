import { requireCustomer } from '@/lib/dal'
import { findUserById } from '@/lib/db/users'
import SettingsClient from '@/app/settings/SettingsClient'

export const metadata = { title: 'Settings — Go Fast Delivery' }

export default async function CustomerSettingsPage() {
  const { userId } = await requireCustomer()
  const user = await findUserById(userId)
  return (
    <SettingsClient
      role="customer"
      initialUser={JSON.parse(JSON.stringify(user))}
    />
  )
}
