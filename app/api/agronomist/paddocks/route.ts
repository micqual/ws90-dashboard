import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const agronomist_id = searchParams.get('agronomist_id')

    if (!agronomist_id) {
      return NextResponse.json({ error: 'agronomist_id required' }, { status: 400 })
    }

    const paddocks = await prisma.station.findMany({
      where: {
        agronomists: {
          some: {
            agronomist_id: agronomist_id,
          },
        },
      },
      include: {
        farmer: true,
        crop_type: true,
        agronomists: {
          include: { agronomist: true },
        },
      },
      orderBy: { paddock_name: 'asc' },
    })

    return NextResponse.json(paddocks)
  } catch (error: any) {
    console.error('Error fetching agronomist paddocks:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
