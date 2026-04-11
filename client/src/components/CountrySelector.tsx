import * as React from "react"
import ReactCountryFlag from "react-country-flag"
import countries from "world-countries"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Pre-process and sort countries
const countryList = countries
  .map((c: any) => ({
    name: c.name.common,
    value: c.name.common,
    code: c.cca2,
  }))
  .sort((a: any, b: any) => a.name.localeCompare(b.name));

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

  const selectedCountry = countryList.find((c: any) => c.value === value || c.name === value)

  const filteredCountries = countryList.filter((c: any) => 
    c.name.toLowerCase().includes(search.toLowerCase())
  )

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
    <div className={cn("relative w-full z-[50]", className)} ref={containerRef} id={id}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between h-10 px-3 font-normal bg-background border-input",
          open && "ring-2 ring-primary border-primary"
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
              <span className="text-sm">
                {selectedCountry.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border bg-background shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 bg-background"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No country found.
              </div>
            ) : (
              filteredCountries.map((country: any) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.value)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors rounded-md",
                    (value === country.value || value === country.name)
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent"
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