import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={session.user as any} />
      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
