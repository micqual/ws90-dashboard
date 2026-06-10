import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const farmers = await prisma.farmer.findMany({
    include: { stations: { include: { crop_type: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(farmers.map((f: any) => ({ ...f, password_hash: undefined })))
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, tier } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.farmer.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)
  const farmer = await prisma.farmer.create({
    data: {
      name,
      email,
      password_hash,
      tier: tier === 'pro' ? 'pro' : 'base',
    },
  })

  return NextResponse.json({ ...farmer, password_hash: undefined })
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { id, tier } = body

  if (!id || !tier) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const farmer = await prisma.farmer.update({
    where: { id },
    data: { tier: tier === 'pro' ? 'pro' : 'base' },
  })

  return NextResponse.json({ ...farmer, password_hash: undefined })
}
