import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const agronomist = await prisma.agronomist.findUnique({
      where: { email },
      include: { paddocks: { include: { station: true } } },
    })

    if (!agronomist) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    if (!agronomist.active) {
      return NextResponse.json({ error: 'Account disabled' }, { status: 403 })
    }

    // Check password
    const validPassword = await bcrypt.compare(password, agronomist.password_hash)
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json({
      id: agronomist.id,
      email: agronomist.email,
      name: agronomist.name,
      paddocks: agronomist.paddocks.map(p => p.station),
    })
  } catch (error: any) {
    console.error('Agronomist login error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
