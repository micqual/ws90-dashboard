import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cropTypes = await prisma.cropType.findMany({
    orderBy: [{ crop_name: 'asc' }, { variety: 'asc' }],
  })

  return NextResponse.json(cropTypes)
}
