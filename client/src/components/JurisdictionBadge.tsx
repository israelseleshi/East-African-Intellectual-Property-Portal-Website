import { Globe } from '@phosphor-icons/react'
import type { Jurisdiction } from '@/shared/database'

type Props = {
  jurisdiction: Jurisdiction
}

const JURISDICTION_IMAGE_FLAGS: Record<string, string> = {
  ET: '/flags/ethiopia-flag.png',
  KE: '/flags/kenya-flag.png',
  ER: '/flags/eritrea-flag.png',
  DJ: '/flags/djibouti-flag.png',
  SO: '/flags/somalia-flag.png',
  SL: '/flags/somalia-flag.png',
  TZ: '/flags/tanzania-flag.webp',
  UG: '/flags/uganda-flag.png',
  RW: '/flags/rwanda-flag.png',
  BI: '/flags/burundi-flag.png',
}

export default function JurisdictionBadge({ jurisdiction }: Props) {
  const isET = jurisdiction === 'ET'
  const imgSrc = JURISDICTION_IMAGE_FLAGS[jurisdiction]
  
  return (
    <span className={[
      "inline-flex h-6 items-center gap-1.5 rounded-none border px-2 text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm",
      isET 
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
        : "bg-blue-500/10 text-blue-600 border-blue-500/20"
    ].join(' ')}>
      {imgSrc ? (
        <img src={imgSrc} alt={jurisdiction} className="h-3 w-4.5 object-cover rounded-sm shadow-sm" />
      ) : (
        <Globe size={12} weight="bold" />
      )}
      <span>{jurisdiction === 'ET' ? 'Ethiopia' : jurisdiction === 'KE' ? 'Kenya' : jurisdiction === 'TZ' ? 'Tanzania' : jurisdiction === 'UG' ? 'Uganda' : jurisdiction === 'RW' ? 'Rwanda' : jurisdiction === 'BI' ? 'Burundi' : jurisdiction}</span>
    </span>
  )
}
