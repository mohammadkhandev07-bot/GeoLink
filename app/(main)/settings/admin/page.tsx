'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ShieldCheck } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useReports, ReportStatusFilter } from '@/lib/hooks/useAdmin'
import { AdminReportCard } from '@/components/admin/AdminReportCard'

const TABS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'dismissed', label: 'Dismissed' },
]

export default function AdminPanelPage() {
  const { profile, loading } = useUser()
  const [tab, setTab] = useState<ReportStatusFilter>('pending')
  const { data: reports = [], isLoading } = useReports(tab)

  if (loading) return <PageLoader />

  // Not the admin account - nothing here for them, same treatment as any
  // other page that doesn't apply to the current user.
  if (!profile?.is_admin) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <p className="text-sm text-muted-foreground text-center py-16">You don't have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <ShieldCheck className="h-5 w-5 text-pink-500" />
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value ? 'bg-card shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-10">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No {tab} reports.</p>
        ) : (
          reports.map(report => (
            <AdminReportCard key={report.id} report={report} actionable={tab === 'pending'} />
          ))
        )}
      </div>
    </div>
  )
}
