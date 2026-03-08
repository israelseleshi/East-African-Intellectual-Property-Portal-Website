import * as React from "react"
import ReactCountryFlag from "react-country-flag"
import countries from "world-countries"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Pre-process and sort countries
const countryList = countries
  .map(c => ({
    name: c.name.common,
    value: c.name.common, // Using common name as the value (e.g., "Ethiopia")
    code: c.cca2,         // 2-letter ISO code for flags
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function CountrySelector({ value, onChange, placeholder = "Select country...", className, id }: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedCountry = countryList.find((c) => c.value === value || c.name === value)

  const filteredCountries = countryList.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={containerRef} id={id}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between apple-input h-10 px-3 font-normal",
          open && "ring-2 ring-[var(--eai-primary)] border-[var(--eai-primary)]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          {selectedCountry ? (
            <>
              <ReactCountryFlag
                countryCode={selectedCountry.code}
                svg
                style={{
                  width: '1.5em',
                  height: '1.1em',
                  borderRadius: '2px',
                  boxShadow: '0 0 1px rgba(0,0,0,0.2)'
                }}
              />
              <span className="text-[14px] text-[var(--eai-text)]">
                {selectedCountry.name}
              </span>
            </>
          ) : (
            <span className="text-[14px] text-[var(--eai-muted)]">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[var(--eai-muted)]" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--eai-border)] bg-[var(--eai-bg)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-[var(--eai-border)] bg-[var(--eai-bg-secondary)]/50">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--eai-muted)]" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 apple-input bg-[var(--eai-bg)]"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--eai-muted)]">
                No country found.
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors rounded-lg",
                    (value === country.value || value === country.name)
                      ? "bg-[var(--eai-primary)]/10 text-[var(--eai-primary)] font-medium"
                      : "text-[var(--eai-text)] hover:bg-[var(--eai-bg-secondary)]"
                  )}
                >
                  <ReactCountryFlag
                    countryCode={country.code}
                    svg
                    style={{
                      width: '1.5em',
                      height: '1.1em',
                      borderRadius: '2px'
                    }}
                  />
                  <span className="flex-1 truncate">{country.name}</span>
                  {(value === country.value || value === country.name) && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
