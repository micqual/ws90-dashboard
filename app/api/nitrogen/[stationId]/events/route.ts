import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: { stationId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const farmerId = (session.user as any).id
  const { stationId } = params
  const station = await prisma.station.findFirst({ where: { id: stationId, farmer_id: farmerId } })
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { type } = body

  if (type === 'soil_test') {
    const { tested_at, depth_cm, no3_n_kg_ha, nh4_n_kg_ha, notes } = body
    const result = await prisma.$queryRaw`
      INSERT INTO nitrogen_soil_tests (station_id, tested_at, depth_cm, no3_n_kg_ha, nh4_n_kg_ha, notes)
      VALUES (${stationId}, ${new Date(tested_at)}, ${Number(depth_cm)||60}, ${Number(no3_n_kg_ha)}, ${Number(nh4_n_kg_ha)||0}, ${notes||null})
      RETURNING *
    ` as any[]
    return NextResponse.json(result[0])
  }

  if (type === 'application') {
    const { applied_at, product, rate_kg_ha, n_kg_ha, method, notes } = body
    const result = await prisma.$queryRaw`
      INSERT INTO nitrogen_applications (station_id, applied_at, product, rate_kg_ha, n_kg_ha, method, notes)
      VALUES (${stationId}, ${new Date(applied_at)}, ${product}, ${Number(rate_kg_ha)}, ${Number(n_kg_ha)}, ${method||'broadcast'}, ${notes||null})
      RETURNING *
    ` as any[]
    return NextResponse.json(result[0])
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
