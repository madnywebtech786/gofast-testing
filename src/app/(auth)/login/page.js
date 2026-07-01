import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import LoginClient from './LoginClient'

const ROLE_DASHBOARDS = {
  admin:    '/admin/dashboard',
  driver:   '/driver/home',
  customer: '/customer/overview',
}

export const metadata = { title: 'Sign In — GoFastDelivery' }

export default async function LoginPage() {
  const session = await getSession()
  if (session?.userId && session?.role) {
    redirect(ROLE_DASHBOARDS[session.role] ?? '/customer/overview')
  }
  return <LoginClient />
}
