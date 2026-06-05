import { DownloadSimple } from '@phosphor-icons/react'
import { Progress } from '@/components/ui/progress'
import { Typography } from '@/components/ui/typography'

interface ExportProgressModalProps {
  isExporting: boolean
  progress: number
  message?: string
  subtext?: string
}

export default function ExportProgressModal({ isExporting, progress, message, subtext }: ExportProgressModalProps) {
  if (!isExporting) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-sm transition-all duration-300">
      <div className="bg-background rounded-xl p-8 shadow-2xl w-full max-w-[320px] flex flex-col items-center text-center space-y-6 border">
        <div className="bg-primary/10 p-3 rounded-full">
          <DownloadSimple size={36} className="text-primary animate-pulse" />
        </div>
        <div className="space-y-2">
          <Typography.h4>{message || 'Exporting...'}</Typography.h4>
          <Typography.muted className="text-sm">{subtext || 'Generating your Excel file.'}</Typography.muted>
        </div>
        <div className="w-full space-y-2 pt-2">
          <div className="flex items-center justify-between px-1 text-sm font-extrabold text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2.5 w-full bg-primary/10" />
        </div>
      </div>
    </div>
  )
}
