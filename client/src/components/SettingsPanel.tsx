"use client"

import { useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  useSettingsStore, 
  SIDEBAR_FONT_SIZES, 
  TOP_BAR_DESIGNS, 
  DASHBOARD_DESIGNS
} from '@/store/settingsStore'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

export function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const { 
    sidebarFontSize, 
    setSidebarFontSize, 
    topBarDesign, 
    setTopBarDesign,
    dashboardDesign,
    setDashboardDesign
  } = useSettingsStore()

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9 rounded-md text-[var(--eai-text-secondary)] hover:text-[var(--eai-text)] hover:bg-[var(--eai-surface)]"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-[400px] sm:w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Appearance Settings</SheetTitle>
            <SheetDescription>
              Customize the look and feel of your dashboard
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="sidebar" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
              <TabsTrigger value="topbar">Top Bar</TabsTrigger>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            </TabsList>

            <TabsContent value="sidebar" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sidebar-font-size">Sidebar Font Size</Label>
                  <Select
                    value={sidebarFontSize}
                    onValueChange={(value) => setSidebarFontSize(value as typeof sidebarFontSize)}
                  >
                    <SelectTrigger id="sidebar-font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIDEBAR_FONT_SIZES.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          <div className="flex items-center justify-between gap-4">
                            <span>{size.label}</span>
                            <span className="text-muted-foreground text-xs">({size.size})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="rounded-md border p-4 bg-[var(--eai-bg)]">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <div 
                    className="font-medium" 
                    style={{ fontSize: SIDEBAR_FONT_SIZES.find(f => f.value === sidebarFontSize)?.size }}
                  >
                    Sample Text
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="topbar" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="topbar-design">Top Bar Design</Label>
                  <Select
                    value={topBarDesign}
                    onValueChange={(value) => setTopBarDesign(value as typeof topBarDesign)}
                  >
                    <SelectTrigger id="topbar-design">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOP_BAR_DESIGNS.map((design) => (
                        <SelectItem key={design.value} value={design.value}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{design.label}</span>
                            <span className="text-muted-foreground text-xs">{design.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border bg-[var(--eai-bg)] overflow-hidden">
                  <p className="text-xs text-muted-foreground px-4 pt-3 pb-2">Preview:</p>
                  <div className="h-16 border-t flex items-center px-4">
                    <div className={`w-full ${getTopBarPreviewClass(topBarDesign)}`}>
                      <div className="bg-muted rounded h-6 w-32" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dashboard" className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="dashboard-design">Dashboard Layout</Label>
                  <Select
                    value={dashboardDesign}
                    onValueChange={(value) => setDashboardDesign(value as typeof dashboardDesign)}
                  >
                    <SelectTrigger id="dashboard-design">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DASHBOARD_DESIGNS.map((design) => (
                        <SelectItem key={design.value} value={design.value}>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{design.label}</span>
                            <span className="text-muted-foreground text-xs">{design.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border bg-[var(--eai-bg)] p-4">
                  <p className="text-xs text-muted-foreground mb-3">Preview:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DASHBOARD_DESIGNS.slice(0, 6).map((design) => (
                      <div 
                        key={design.value}
                        className={`rounded-md border p-2 text-center text-xs transition-colors ${
                          dashboardDesign === design.value 
                            ? 'border-[var(--eai-primary)] bg-[var(--eai-primary)]/10' 
                            : 'border-border hover:border-[var(--eai-border)]'
                        }`}
                      >
                        {design.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Invoice design selector removed — only classic layout is supported now */}
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  )
}

function getTopBarPreviewClass(design: string): string {
  switch (design) {
    case 'minimal':
      return 'flex items-center'
    case 'centered':
      return 'flex items-center justify-center'
    case 'spacious':
      return 'flex items-center justify-between px-4'
    case 'condensed':
      return 'flex items-center gap-2'
    case 'classic':
      return 'flex items-center justify-between'
    default:
      return 'flex items-center'
  }
}
