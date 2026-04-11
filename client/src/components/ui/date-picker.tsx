import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowFuture?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled,
  allowFuture = false
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between font-normal hover:bg-background",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {date ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : <span>{placeholder}</span>}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => {
            onDateChange?.(date)
            setOpen(false)
          }}
          disabled={allowFuture ? undefined : (date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
