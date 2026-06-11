import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { farmerId: string } }
) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { farmerId } = params
  const body = await request.json()
  const { active, tier } = body

  const farmer = await prisma.farmer.update({
    where: { id: farmerId },
    data: {
      ...(active !== undefined && { active }),
      ...(tier !== undefined && { tier }),
    },
  })

  return NextResponse.json({ ...farmer, password_hash: undefined })
}
