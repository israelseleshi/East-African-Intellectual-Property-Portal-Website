import { useState, useCallback, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { CaretDown, CaretRight, DotsSixVertical, ArrowClockwise, Table } from '@phosphor-icons/react'
import {
  ALL_COLUMNS,
  COLUMN_GROUPS,
  PRESETS,
  getDefaultPreferences,
  getGroupColumns,
  type ColumnDef,
  type ColumnGroupId,
  type ColumnPreferences,
} from '@/utils/tableColumnConfig'

interface ColumnCustomizerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preferences: ColumnPreferences
  onApply: (prefs: ColumnPreferences) => void
}

function ColumnCheckboxItem({
  column,
  checked,
  onToggle,
  isDragOver,
}: {
  column: ColumnDef
  checked: boolean
  onToggle: () => void
  isDragOver: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
        isDragOver ? 'bg-accent ring-1 ring-primary' : 'hover:bg-muted/50'
      } ${column.id === 'actions' ? 'opacity-50 pointer-events-none' : ''}`}
      draggable={column.id !== 'actions'}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <DotsSixVertical size={14} weight="bold" />
      </div>
      <Checkbox
        id={`col-${column.id}`}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={column.id === 'actions'}
      />
      <Label
        htmlFor={`col-${column.id}`}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
      >
        {column.label}
      </Label>
    </div>
  )
}

function ColumnGroupSection({
  groupId,
  groupLabel,
  groupColor,
  columns,
  visibleColumns,
  columnOrder,
  onToggleColumn,
  onToggleGroup,
  onReorderColumn,
}: {
  groupId: ColumnGroupId
  groupLabel: string
  groupColor: string
  columns: ColumnDef[]
  visibleColumns: Set<string>
  columnOrder: string[]
  onToggleColumn: (id: string) => void
  onToggleGroup: (groupId: ColumnGroupId, checked: boolean) => void
  onReorderColumn: (dragId: string, dropId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const dragRef = useRef<string | null>(null)
  const dropRef = useRef<string | null>(null)

  const allChecked = columns.every(c => visibleColumns.has(c.id) || c.id === 'actions')
  const someChecked = columns.some(c => visibleColumns.has(c.id))

  const handleDragStart = useCallback((id: string) => {
    dragRef.current = id
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    dropRef.current = id
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragRef.current && dropRef.current && dragRef.current !== dropRef.current) {
      onReorderColumn(dragRef.current, dropRef.current)
    }
    dragRef.current = null
    dropRef.current = null
  }, [onReorderColumn])

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <CaretRight size={14} /> : <CaretDown size={14} />}
          </button>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${groupColor}`}>
            {groupLabel}
          </span>
          <span className="text-xs text-muted-foreground">({columns.length})</span>
        </div>
        <button
          onClick={() => onToggleGroup(groupId, !allChecked)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {allChecked ? 'Deselect All' : someChecked ? 'Select All' : 'Select All'}
        </button>
      </div>
      {!collapsed && (
        <div className="ml-2 space-y-0.5">
          {columns.map(col => {
            const isDragOver = dropRef.current === col.id && dragRef.current !== col.id
            return (
              <div
                key={col.id}
                draggable={col.id !== 'actions'}
                onDragStart={() => handleDragStart(col.id)}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragEnd={handleDragEnd}
              >
                <ColumnCheckboxItem
                  column={col}
                  checked={visibleColumns.has(col.id)}
                  onToggle={() => onToggleColumn(col.id)}
                  isDragOver={isDragOver}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ColumnCustomizerModal({
  open,
  onOpenChange,
  preferences,
  onApply,
}: ColumnCustomizerModalProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...preferences.visibleColumns])
  const [columnOrder, setColumnOrder] = useState<string[]>(() => [...preferences.columnOrder])

  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns])

  const handleToggleColumn = useCallback((id: string) => {
    setVisibleColumns(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id)
      return [...prev, id]
    })
  }, [])

  const handleToggleGroup = useCallback((groupId: ColumnGroupId, checked: boolean) => {
    const groupCols = getGroupColumns(groupId)
    const groupIds = groupCols.map(c => c.id)
    setVisibleColumns(prev => {
      if (checked) {
        const newCols = [...prev]
        for (const id of groupIds) {
          if (!newCols.includes(id)) newCols.push(id)
        }
        return newCols
      }
      return prev.filter(c => !groupIds.includes(c))
    })
  }, [])

  const handleReorderColumn = useCallback((dragId: string, dropId: string) => {
    setColumnOrder(prev => {
      const order = [...prev]
      const dragIdx = order.indexOf(dragId)
      const dropIdx = order.indexOf(dropId)
      if (dragIdx === -1 || dropIdx === -1) return prev
      order.splice(dragIdx, 1)
      order.splice(dropIdx, 0, dragId)
      return order
    })
  }, [])

  const handlePreset = useCallback((presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId)
    if (!preset) return
    setVisibleColumns([...preset.columns])
  }, [])

  const handleReset = useCallback(() => {
    const defaults = getDefaultPreferences()
    setVisibleColumns([...defaults.visibleColumns])
    setColumnOrder([...defaults.columnOrder])
  }, [])

  const handleApply = useCallback(() => {
    onApply({ visibleColumns, columnOrder })
    onOpenChange(false)
  }, [visibleColumns, columnOrder, onApply, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Table size={22} weight="duotone" className="text-primary" />
            <DialogTitle>Customize Table Columns</DialogTitle>
          </div>
          <DialogDescription>
            Show, hide, and reorder columns. Changes save automatically when you apply.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-3 border-b">
          {PRESETS.map(preset => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => handlePreset(preset.id)}
              className="text-xs"
              title={preset.description}
            >
              {preset.label}
            </Button>
          ))}
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={handleReset} title="Reset to Default">
            <ArrowClockwise size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-3">
          {COLUMN_GROUPS.map(group => {
            const groupCols = getGroupColumns(group.id)
            if (groupCols.length === 0) return null
            return (
              <ColumnGroupSection
                key={group.id}
                groupId={group.id}
                groupLabel={group.label}
                groupColor={group.color}
                columns={groupCols}
                visibleColumns={visibleSet}
                columnOrder={columnOrder}
                onToggleColumn={handleToggleColumn}
                onToggleGroup={handleToggleGroup}
                onReorderColumn={handleReorderColumn}
              />
            )
          })}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
