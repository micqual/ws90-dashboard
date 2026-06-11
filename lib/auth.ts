import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const farmer = await prisma.farmer.findUnique({
          where: { email: credentials.email },
        })

        if (!farmer) return null
        if (farmer.active === false) return null

        const passwordValid = await bcrypt.compare(
          credentials.password,
          farmer.password_hash
        )

        if (!passwordValid) return null

        return {
          id: farmer.id,
          email: farmer.email,
          name: farmer.name,
          role: farmer.email === 'mdpankhurst@gmail.com' ? 'admin' : 'farmer',
          tier: farmer.tier ?? 'base',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.tier = (user as any).tier
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).tier = token.tier
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
