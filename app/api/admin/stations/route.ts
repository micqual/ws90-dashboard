import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const stations = await prisma.station.findMany({
    include: { farmer: true, crop_type: true },
    orderBy: { paddock_name: 'asc' },
  })

  return NextResponse.json(stations)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if ((session?.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id, farmer_id, paddock_name, hectares, crop_type_id,
      planted_date, growth_stage, spray_wind_override, frost_temp_override,
      sim_phone_number, sim_provider, sim_activation_date, sim_imei,
    } = body

    if (!id || !farmer_id) {
      return NextResponse.json({ error: 'Station ID and Farmer ID required' }, { status: 400 })
    }

    const station = await prisma.station.upsert({
      where: { id },
      create: {
        id, farmer_id, paddock_name, hectares,
        crop_type_id: crop_type_id ? Number(crop_type_id) : null,
        planted_date: planted_date ? new Date(planted_date) : null,
        growth_stage, spray_wind_override, frost_temp_override,
        sim_phone_number, sim_provider, sim_imei,
        sim_activation_date: sim_activation_date ? new Date(sim_activation_date) : null,
      },
      update: {
        farmer_id, paddock_name, hectares,
        crop_type_id: crop_type_id ? Number(crop_type_id) : null,
        planted_date: planted_date ? new Date(planted_date) : null,
        growth_stage, spray_wind_override, frost_temp_override,
        sim_phone_number, sim_provider, sim_imei,
        sim_activation_date: sim_activation_date ? new Date(sim_activation_date) : null,
      },
      include: { farmer: true, crop_type: true },
    })

    return NextResponse.json(station)
  } catch (e: any) {
    console.error('POST /api/admin/stations error:', e)
    return NextResponse.json({ error: e.message || 'Failed to save station' }, { status: 500 })
  }
}
