import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const farmerId = (session.user as any).id
  const body = await request.json()
  const {
    paddock_name, crop_type_id, planted_date, hectares, soil_type,
    target_yield_t_ha, farm_name, farm_address, latitude, longitude,
  } = body

  if (!paddock_name) {
    return NextResponse.json({ error: 'Paddock name is required' }, { status: 400 })
  }

  // Generate a unique virtual station ID — distinct from physical device IDs
  const virtualId = `virtual_${randomBytes(6).toString('hex')}`

  const station = await prisma.station.create({
    data: {
      id: virtualId,
      farmer_id: farmerId,
      paddock_name,
      crop_type_id: crop_type_id ? Number(crop_type_id) : null,
      planted_date: planted_date ? new Date(planted_date) : null,
      hectares: hectares ? Number(hectares) : null,
      soil_type: soil_type || 'loam',
      target_yield_t_ha: target_yield_t_ha ? Number(target_yield_t_ha) : null,
      farm_name: farm_name || null,
      farm_address: farm_address || null,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      is_virtual: true,
    },
    include: { crop_type: true },
  })

  return NextResponse.json(station)
}
