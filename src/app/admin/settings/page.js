import { requireAdmin } from '@/lib/dal'
import { findUserById } from '@/lib/db/users'
import SettingsClient from '@/app/settings/SettingsClient'

export const metadata = { title: 'Settings — Admin Panel' }

export default async function AdminSettingsPage() {
  const { userId } = await requireAdmin()
  const user = await findUserById(userId)
  return (
    <SettingsClient
      role="admin"
      initialUser={JSON.parse(JSON.stringify(user))}
    />
  )
}
