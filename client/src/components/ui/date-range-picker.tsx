import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  fromDate?: Date
  toDate?: Date
  onDateChange?: (from: Date | undefined, to: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  fromDate,
  toDate,
  onDateChange,
  placeholder = "Select date range",
  className
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between font-normal hover:bg-background",
            (!fromDate || !toDate) && "text-muted-foreground",
            className
          )}
        >
          {fromDate && toDate
            ? `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : fromDate
            ? `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ...`
            : <span>{placeholder}</span>
          }
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{
            from: fromDate,
            to: toDate
          }}
          onSelect={(range) => {
            onDateChange?.(range?.from, range?.to)
          }}
          disabled={(date) => date > new Date()}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}