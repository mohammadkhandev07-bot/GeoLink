import Link from 'next/link'
import { ChevronLeft, ChevronRight, ShieldCheck, FileText, ScrollText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function PrivacySettingsPage() {
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Privacy Settings</h1>
      </div>

      <Card>
        <CardContent className="pt-4 divide-y">
          <Link href="/settings/privacy/account" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <span className="text-sm font-medium block">Account Privacy</span>
                <span className="text-xs text-muted-foreground">Who can see your posts, message you, and find you</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/privacy-policy" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Privacy Policy</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/terms" className="flex items-center justify-between py-3 hover:text-pink-500 transition-colors">
            <div className="flex items-center gap-3">
              <ScrollText className="h-5 w-5" />
              <span className="text-sm font-medium">Terms &amp; Conditions</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
