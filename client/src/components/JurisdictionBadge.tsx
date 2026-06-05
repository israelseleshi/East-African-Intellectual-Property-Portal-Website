import ReactCountryFlag from 'react-country-flag'
import countries from 'world-countries'
import type { Jurisdiction } from '@/shared/database'

type Props = {
  jurisdiction: Jurisdiction
}

const COUNTRY_NAME_MAP: Record<string, string> = {}
for (const c of countries) {
  COUNTRY_NAME_MAP[c.cca2] = c.name.common
}

export default function JurisdictionBadge({ jurisdiction }: Props) {
  const name = COUNTRY_NAME_MAP[jurisdiction] || jurisdiction

  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold tracking-tight">
      <ReactCountryFlag
        countryCode={jurisdiction}
        svg
        style={{ width: '1.1em', height: '0.8em', borderRadius: '2px' }}
      />
      <span>{name}</span>
    </span>
  )
}
