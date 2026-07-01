import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdmin, handleApiError } from '@/lib/dal'
import { findAllDrivers, findActiveRoutesByDriverIds } from '@/lib/db/drivers'
import { createUser, emailExists } from '@/lib/db/users'
import { nanoid } from 'nanoid'

export async function GET() {
  try {
    await requireAdmin()
    const drivers = await findAllDrivers()

    // Single bulk query instead of N+1 per-driver lookups.
    const routesByDriver = await findActiveRoutesByDriverIds(drivers.map((d) => String(d._id)))

    const annotated = drivers.map((d) => {
      const route = routesByDriver.get(String(d._id))
      const pendingStopCount = route
        ? (route.optimizedStops ?? []).filter((s) => !s.completedAt).length
        : 0
      return { ...d, pendingStopCount }
    })

    return NextResponse.json(JSON.parse(JSON.stringify(annotated)))
  } catch (err) {
    return handleApiError(err, '[GET /api/drivers]')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()

    const { name, email, phone } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Check email uniqueness
    const exists = await emailExists(email)
    if (exists) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 })
    }

    // Generate a secure temporary password
    // Format: 3 random words pattern → e.g., "Xk9mP2nQ" (readable, secure enough for temp use)
    const tempPassword = nanoid(10)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const user = await createUser({
      email,
      passwordHash,
      name,
      phone: phone || null,
      role: 'driver',
      driverProfile: {
        isOnDuty: false,
        currentLocation: null,
        activeAssignmentId: null,
      },
    })

    // Return temp password in this response ONLY — never stored in plaintext
    return NextResponse.json(
      {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        tempPassword, // Shown once to admin
      },
      { status: 201 }
    )
  } catch (err) {
    return handleApiError(err, '[POST /api/drivers]')
  }
}
