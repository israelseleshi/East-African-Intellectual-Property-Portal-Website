import { Card, CardContent } from '@/components/ui/card'
import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center space-y-6">
      <div className="p-6 bg-primary/10 rounded-full">
        <LayoutDashboard size={64} className="text-primary animate-pulse" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter">Command Center</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          We're fine-tuning your intellectual property dashboard. Advanced analytics and real-time registry sync coming soon.
        </p>
      </div>
      <Card className="border-dashed border-2 bg-muted/30 max-w-sm w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
            <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
            Under Construction
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
