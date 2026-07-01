import PusherProvider from '@/components/realtime/PusherProvider'
import DriverShell from '@/components/driver/DriverShell'

export default function DriverLayout({ children }) {
  return (
    <PusherProvider>
      <DriverShell>{children}</DriverShell>
    </PusherProvider>
  )
}
