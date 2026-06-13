import { AuthGuard } from '@/components/shared/AuthGuard'
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ResponsiveLayout>{children}</ResponsiveLayout>
    </AuthGuard>
  )
}
