import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { stationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const farmerId = (session.user as any).id
  const { stationId } = params

  const virtualStation = await prisma.station.findFirst({
    where: { id: stationId, farmer_id: farmerId, is_virtual: true },
  })

  if (!virtualStation) {
    return NextResponse.json({ error: 'Virtual paddock not found' }, { status: 404 })
  }

  const body = await request.json()
  const { new_station_id } = body

  if (!new_station_id || !new_station_id.trim()) {
    return NextResponse.json({ error: 'New station ID is required' }, { status: 400 })
  }

  const targetId = new_station_id.trim()

  // Check the new station ID isn't already in use by another paddock
  const existing = await prisma.station.findUnique({ where: { id: targetId } })
  if (existing) {
    return NextResponse.json({ error: `Station ID "${targetId}" is already in use by another paddock` }, { status: 400 })
  }

  // Check the physical device has actually sent at least one reading,
  // so we know it's really connected before we migrate everything to it
  const hasReadings = await prisma.weatherReading.findFirst({
    where: { station_id: targetId },
  })

  if (!hasReadings) {
    return NextResponse.json({
      error: `No weather readings found yet for station ID "${targetId}". Make sure the WS90 is powered on and has sent at least one reading before converting.`,
    }, { status: 400 })
  }

  // Migrate everything in a transaction
  await prisma.$transaction(async (tx) => {
    // Create the new real station with the virtual paddock's data
    await tx.station.create({
      data: {
        id: targetId,
        farmer_id: farmerId,
        paddock_name: virtualStation.paddock_name,
        hectares: virtualStation.hectares,
        crop_type_id: virtualStation.crop_type_id,
        planted_date: virtualStation.planted_date,
        growth_stage: virtualStation.growth_stage,
        soil_type: virtualStation.soil_type,
        target_yield_t_ha: virtualStation.target_yield_t_ha,
        farm_name: virtualStation.farm_name,
        farm_address: virtualStation.farm_address,
        latitude: virtualStation.latitude,
        longitude: virtualStation.longitude,
        elevation_m: virtualStation.elevation_m,
        installation_date: new Date(),
        paddock_notes: virtualStation.paddock_notes,
        is_virtual: false,
      },
    })

    // Move all related records across
    await tx.$executeRaw`UPDATE nitrogen_soil_tests SET station_id = ${targetId} WHERE station_id = ${stationId}`
    await tx.$executeRaw`UPDATE nitrogen_applications SET station_id = ${targetId} WHERE station_id = ${stationId}`
    await tx.$executeRaw`UPDATE phosphorus_soil_tests SET station_id = ${targetId} WHERE station_id = ${stationId}`
    await tx.$executeRaw`UPDATE agronomist_notes SET station_id = ${targetId} WHERE station_id = ${stationId}`
    await tx.$executeRaw`UPDATE manual_rain_events SET station_id = ${targetId} WHERE station_id = ${stationId}`

    // Delete the old virtual station record
    await tx.station.delete({ where: { id: stationId } })
  })

  const updated = await prisma.station.findUnique({
    where: { id: targetId },
    include: { crop_type: true },
  })

  return NextResponse.json(updated)
}
