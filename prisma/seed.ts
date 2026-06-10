import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@farm.com'
  const password = process.env.ADMIN_PASSWORD || 'changeme123'
  const name = process.env.ADMIN_NAME || 'Admin'

  const existing = await prisma.farmer.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin user ${email} already exists`)
    return
  }

  const password_hash = await bcrypt.hash(password, 12)
  const admin = await prisma.farmer.create({
    data: { name, email, password_hash },
  })

  console.log(`✅ Created admin user: ${admin.email}`)
  console.log(`   Password: ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
