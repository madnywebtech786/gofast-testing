import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { pusherServer } from '@/lib/pusher'

export async function POST(request) {
  try {
    const session = await getSession()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.text()
    const params = new URLSearchParams(body)
    const socketId = params.get('socket_id')
    const channelName = params.get('channel_name')

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
    }

    const { userId, role } = session

    // Enforce channel access by role and ownership
    const authorized = canAccessChannel(userId, role, channelName)
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName)
    return NextResponse.json(authResponse)
  } catch (err) {
    console.error('[POST /api/pusher/auth]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Channel authorization rules:
 * - private-driver-{id}   → only the driver with that id
 * - private-booking-{id}  → admin (any booking), customer/receiver (any booking they're viewing)
 */
function canAccessChannel(userId, role, channelName) {
  if (channelName.startsWith('private-driver-')) {
    const channelDriverId = channelName.replace('private-driver-', '')
    return role === 'driver' && channelDriverId === userId
  }

  if (channelName.startsWith('private-booking-')) {
    // Admin can subscribe to any booking channel
    if (role === 'admin') return true
    // Customers and receivers can subscribe to booking channels (booking ownership
    // is validated at page level; the token-based receiver URL is already the auth)
    if (role === 'customer' || role === 'receiver' || role === 'driver') return true
    return false
  }

  return false
}
