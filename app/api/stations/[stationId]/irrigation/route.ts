import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const farmerId = (session.user as any).id
  const { stationId } = params

  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
  })
  if (!station) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const events = await prisma.$queryRaw`
    SELECT * FROM irrigation_events
    WHERE station_id = ${stationId}
    ORDER BY irrigated_at DESC
    LIMIT 10
  `

  return NextResponse.json(events)
}

export async function POST(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const farmerId = (session.user as any).id
  const { stationId } = params

  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
  })
  if (!station) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const { type, amount_mm, duration_min, notes, irrigated_at } = body

  if (!type || !['overhead', 'drip', 'furrow'].includes(type)) {
    return NextResponse.json({ error: 'Invalid irrigation type' }, { status: 400 })
  }

  const event = await prisma.$queryRaw`
    INSERT INTO irrigation_events (station_id, irrigated_at, type, amount_mm, duration_min, notes)
    VALUES (
      ${stationId},
      ${irrigated_at ? new Date(irrigated_at) : new Date()},
      ${type},
      ${amount_mm ? Number(amount_mm) : null},
      ${duration_min ? Number(duration_min) : null},
      ${notes || null}
    )
    RETURNING *
  `

  return NextResponse.json((event as any[])[0])
}
