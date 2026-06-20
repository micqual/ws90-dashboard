import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
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
  const {
    crop_type_id, planted_date, growth_stage, paddock_name, hectares,
    soil_type, target_yield_t_ha, farm_name, farm_address,
    latitude, longitude, elevation_m, installation_date, paddock_notes,
    agronomist_name, agronomist_company, agronomist_phone,
    sim_phone_number, sim_provider, sim_activation_date, sim_imei,
  } = body

  const updated = await prisma.station.update({
    where: { id: stationId },
    data: {
      crop_type_id: crop_type_id ? Number(crop_type_id) : null,
      planted_date: planted_date ? new Date(planted_date) : null,
      growth_stage: growth_stage || null,
      paddock_name: paddock_name || station.paddock_name,
      hectares: hectares ? Number(hectares) : station.hectares,
      soil_type: soil_type || station.soil_type || 'loam',
      target_yield_t_ha: target_yield_t_ha ? Number(target_yield_t_ha) : station.target_yield_t_ha,
      farm_name: farm_name || station.farm_name,
      farm_address: farm_address || station.farm_address,
      latitude: latitude ? Number(latitude) : station.latitude,
      longitude: longitude ? Number(longitude) : station.longitude,
      elevation_m: elevation_m ? Number(elevation_m) : station.elevation_m,
      installation_date: installation_date ? new Date(installation_date) : station.installation_date,
      paddock_notes: paddock_notes || station.paddock_notes,
      sim_phone_number: sim_phone_number || station.sim_phone_number,
      sim_provider: sim_provider || station.sim_provider,
      sim_activation_date: sim_activation_date ? new Date(sim_activation_date) : station.sim_activation_date,
      sim_imei: sim_imei || station.sim_imei,
    },
    include: { crop_type: true },
  })

  // Agronomist details live on the farmer record, applies across all paddocks
  if (agronomist_name || agronomist_company || agronomist_phone) {
    await prisma.farmer.update({
      where: { id: farmerId },
      data: {
        agronomist_name: agronomist_name || undefined,
        agronomist_company: agronomist_company || undefined,
        agronomist_phone: agronomist_phone || undefined,
      },
    })
  }

  const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } })

  return NextResponse.json({
    ...updated,
    agronomist_name: farmer?.agronomist_name,
    agronomist_company: farmer?.agronomist_company,
    agronomist_phone: farmer?.agronomist_phone,
  })
}
