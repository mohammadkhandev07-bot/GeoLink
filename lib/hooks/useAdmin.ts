'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { ReportWithProfiles, AccountAppeal } from '@/lib/types/database.types'

const RESTRICTION_DAYS = 10
const SUSPENSION_HOURS = 24

export type ReportStatusFilter = 'pending' | 'actioned' | 'dismissed'

export function useReports(status: ReportStatusFilter) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin-reports', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(*), reported_user:profiles!reports_reported_user_id_fkey(*)')
        .eq('status', status)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ReportWithProfiles[]
    },
  })
}

// A small extra detail line for the report - the actual comment/message
// text, when the target still exists, so the admin doesn't have to go
// hunting for context on their own.
export function useReportTargetPreview(report?: ReportWithProfiles) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['report-target-preview', report?.id],
    queryFn: async () => {
      if (!report) return null
      if (report.target_type === 'post' && report.post_id) {
        const { data } = await supabase.from('posts').select('content, media_url').eq('id', report.post_id).maybeSingle()
        return data?.content || (data?.media_url ? '(media post)' : null)
      }
      if (report.target_type === 'comment' && report.comment_id) {
        const { data } = await supabase.from('comments').select('content').eq('id', report.comment_id).maybeSingle()
        return data?.content ?? null
      }
      if (report.target_type === 'story_comment' && report.story_comment_id) {
        const { data } = await supabase.from('story_comments').select('content').eq('id', report.story_comment_id).maybeSingle()
        return data?.content ?? null
      }
      if (report.target_type === 'message' && report.message_id) {
        const { data } = await supabase.from('messages').select('content').eq('id', report.message_id).maybeSingle()
        return data?.content ?? null
      }
      return null
    },
    enabled: !!report,
  })
}

function reportStatusUpdate(supabase: ReturnType<typeof createClient>, reportId: string, status: 'actioned' | 'dismissed') {
  return supabase.from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', reportId)
}

export function useDismissReport() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId }: { reportId: string }) => {
      const { error } = await reportStatusUpdate(supabase, reportId, 'dismissed')
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  })
}

export function useSuspendUser() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, reason, reportId }: { userId: string; reason: string; reportId?: string }) => {
      const now = new Date()
      const deadline = new Date(now.getTime() + SUSPENSION_HOURS * 60 * 60 * 1000)
      const { error } = await supabase
        .from('profiles')
        .update({
          is_suspended: true,
          suspended_at: now.toISOString(),
          suspension_deadline: deadline.toISOString(),
          suspension_reason: reason,
        })
        .eq('id', userId)
      if (error) throw error
      if (reportId) {
        const { error: reportErr } = await reportStatusUpdate(supabase, reportId, 'actioned')
        if (reportErr) throw reportErr
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  })
}

export function useUnsuspendUser() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: false, suspended_at: null, suspension_deadline: null, suspension_reason: null })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  })
}

export type RestrictionFeature = 'post' | 'comment' | 'message' | 'story'

export function useRestrictUser() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, feature, reportId }: { userId: string; feature: RestrictionFeature; reportId?: string }) => {
      const until = new Date(Date.now() + RESTRICTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
      const column = `restrict_${feature}_until`
      const { error } = await supabase.from('profiles').update({ [column]: until }).eq('id', userId)
      if (error) throw error
      if (reportId) {
        const { error: reportErr } = await reportStatusUpdate(supabase, reportId, 'actioned')
        if (reportErr) throw reportErr
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  })
}

// ------------------------------------------------------------------
// Account appeals - reviewed by an admin. Approving one lifts the
// suspension immediately; rejecting just leaves it as-is (the 24h
// countdown on the suspension screen keeps running either way).
// ------------------------------------------------------------------
export type AppealWithProfile = AccountAppeal & { profiles: any }

export function usePendingAppeals() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['admin-appeals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_appeals')
        .select('*, profiles(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as unknown as AppealWithProfile[]
    },
  })
}

export function useReviewAppeal() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ appealId, userId, approve }: { appealId: string; userId: string; approve: boolean }) => {
      const { error: appealErr } = await supabase
        .from('account_appeals')
        .update({ status: approve ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', appealId)
      if (appealErr) throw appealErr

      if (approve) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ is_suspended: false, suspended_at: null, suspension_deadline: null, suspension_reason: null })
          .eq('id', userId)
        if (profileErr) throw profileErr
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-appeals'] })
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
    },
  })
}
