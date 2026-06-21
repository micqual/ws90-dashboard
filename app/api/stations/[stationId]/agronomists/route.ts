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

  const { stationId } = params
  const { agronomist_ids } = await request.json()

  try {
    // Delete existing assignments for this station
    await prisma.paddockAgronomist.deleteMany({
      where: { station_id: stationId },
    })

    // Create new assignments
    if (agronomist_ids && agronomist_ids.length > 0) {
      await prisma.paddockAgronomist.createMany({
        data: agronomist_ids.map((id: string) => ({
          station_id: stationId,
          agronomist_id: id,
        })),
        skipDuplicates: true,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving agronomists:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
