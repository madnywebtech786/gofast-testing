import PusherProvider from '@/components/realtime/PusherProvider'

export default function TrackLayout({ children }) {
  return <PusherProvider>{children}</PusherProvider>
}
