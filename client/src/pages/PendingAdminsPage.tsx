import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { authApi } from "@/api/auth"
import { useAuthStore, isSuperAdmin } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Typography } from "@/components/ui/typography"
import { toast } from "sonner"
import { Check, X, UserPlus, Search, Clock, Mail, Building, AlertTriangle } from "lucide-react"

interface PendingAdmin {
  id: string
  full_name: string
  email: string
  firm_name?: string
  created_at: string
  is_approved: number
  rejection_count: number
}

export default function PendingAdminsPage() {
  const user = useAuthStore((state) => state.user)
  const [admins, setAdmins] = useState<PendingAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadPendingAdmins()
  }, [])

  const loadPendingAdmins = async () => {
    try {
      setLoading(true)
      const response = await authApi.listPendingAdmins()
      setAdmins(response.admins || [])
    } catch (error) {
      console.error("Failed to load pending admins:", error)
      toast.error("Failed to load pending administrators")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (adminId: string) => {
    try {
      setProcessing(adminId)
      await authApi.approveAdmin(adminId)
      toast.success("Administrator approved successfully")
      setAdmins(admins.filter(a => a.id !== adminId))
    } catch (error) {
      console.error("Failed to approve:", error)
      toast.error("Failed to approve administrator")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (adminId: string) => {
    try {
      setProcessing(adminId)
      await authApi.rejectAdmin(adminId)
      toast.success("Administrator rejected")
      setAdmins(admins.filter(a => a.id !== adminId))
    } catch (error) {
      console.error("Failed to reject:", error)
      toast.error("Failed to reject administrator")
    } finally {
      setProcessing(null)
    }
  }

  const filteredAdmins = admins.filter(admin => 
    !searchQuery || 
    admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.firm_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isSuperAdmin(user)) {
    return (
      <div className="p-8 text-center">
        <Typography.h2>Access Denied</Typography.h2>
        <Typography.muted>You don't have permission to view this page.</Typography.muted>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[100vw] mx-auto p-4 md:p-8 space-y-6 min-h-screen bg-[#E8E8ED]">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Typography.h1a>Pending Administrators</Typography.h1a>
          <Typography.muted className="hidden sm:block">
            Review and approve new administrator accounts.
          </Typography.muted>
        </div>
      </header>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 md:w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search administrators..." 
                className="pl-9 bg-[#E8E8ED]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredAdmins.length} administrator{filteredAdmins.length === 1 ? '' : 's'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus size={48} className="mx-auto text-muted-foreground mb-4" />
              <Typography.h3>No Pending Administrators</Typography.h3>
              <Typography.muted>
                {searchQuery ? "No administrators match your search." : "All administrator accounts have been reviewed."}
              </Typography.muted>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-background rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {admin.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold">{admin.full_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail size={12} />
                          {admin.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground ml-13">
                      {admin.firm_name && (
                        <div className="flex items-center gap-2">
                          <Building size={12} />
                          {admin.firm_name}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        Applied {new Date(admin.created_at).toLocaleDateString()}
                      </div>
                      {admin.rejection_count > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle size={12} />
                          <span className="text-xs font-medium">
                            Rejected {admin.rejection_count}/3 times
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {admin.rejection_count >= 3 ? (
                      <Badge variant="destructive" className="text-xs">
                        Permanently Rejected
                      </Badge>
                    ) : admin.is_approved === 1 ? (
                      <Badge className="bg-green-600 text-xs">
                        Approved
                      </Badge>
                    ) : admin.rejection_count > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        Rejected ({admin.rejection_count})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Pending
                      </Badge>
                    )}
                    {admin.rejection_count < 3 && (
                      <>
                        <Button
                          onClick={() => handleApprove(admin.id)}
                          disabled={processing === admin.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check size={16} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(admin.id)}
                          disabled={processing === admin.id}
                          variant="destructive"
                        >
                          <X size={16} className="mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}