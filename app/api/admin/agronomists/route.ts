import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const agronomists = await prisma.agronomist.findMany({
    include: { farmer: true },
    orderBy: { email: 'asc' },
  })

  return NextResponse.json(agronomists)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { email, name, password, farmer_id } = await request.json()

    if (!email || !password || !farmer_id) {
      return NextResponse.json({ error: 'Email, password, and farmer ID required' }, { status: 400 })
    }

    // Check email doesn't exist
    const existing = await prisma.agronomist.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    const agronomist = await prisma.agronomist.create({
      data: { email, name, password_hash, farmer_id },
      include: { farmer: true },
    })

    return NextResponse.json(agronomist)
  } catch (error: any) {
    console.error('Create agronomist error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
