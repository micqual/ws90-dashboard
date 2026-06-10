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

  // Verify station belongs to farmer
  const station = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId },
  })

  if (!station) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const readings = await prisma.weatherReading.findMany({
    where: { station_id: stationId },
    orderBy: { created_at: 'desc' },
    take: 48, // last 48 readings
  })

  return NextResponse.json(readings.reverse())
}
