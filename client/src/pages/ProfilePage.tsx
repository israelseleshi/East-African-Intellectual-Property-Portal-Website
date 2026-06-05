import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { User, Mail, Shield, Lock, Save, Loader2, Edit2, Phone, Building2, Trash2, Plus, Briefcase, Key, Smartphone, AlertTriangle, UserPlus, Check, X, Search, Clock, Building, MapPin } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { authService } from '@/utils/api'
import { toast } from 'sonner'
import { agentsApi, Agent } from '@/api/agents'
import { authApi } from '@/api/auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { CountrySelector } from '@/components/CountrySelector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import HelpButton from '@/components/HelpButton'

export default function ProfilePage() {
  const { user, login } = useAuthStore()
  const { companyInfo, setCompanyInfo, fetchCompanySettings, saveCompanySettings, settingsSaving, settingsLoading } = useSettingsStore()
  
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)

  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    firmName: user?.firm_name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentDialogOpen, setAgentDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    country: '',
    city: '',
    subcity: '',
    woreda: '',
    houseNo: '',
    telephone: '',
    email: '',
    poBox: '',
    fax: ''
  })
  const [agentFormLoading, setAgentFormLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null)

  // 2FA state
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false)
  const [totpSecret, setTotpSecret] = useState('')
  const [totpUri, setTotpUri] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')

  // Pending Admins state
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingProcessing, setPendingProcessing] = useState<string | null>(null)
  const [pendingSearch, setPendingSearch] = useState("")
  const isUserSuperAdmin = user?.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        firmName: user.firm_name || '',
      }))
    } else {
      authService.me().then(data => {
        if (data) {
          login(data);
        }
      }).catch(() => {});
    }
  }, [user, login])

  useEffect(() => {
    fetchAgents()
    fetch2FAStatus()
    fetchCompanySettings()
  }, [])

  const fetch2FAStatus = async () => {
    try {
      const response = await authApi.get2FAStatus()
      setTotpEnabled(response.totp_enabled || false)
    } catch (error) {
      console.error('Failed to fetch 2FA status:', error)
    }
  }

  const fetchAgents = async () => {
    setAgentsLoading(true)
    try {
      const response = await agentsApi.list()
      if (response.success) {
        setAgents(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    } finally {
      setAgentsLoading(false)
    }
  }

  const handleOpenAgentDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent)
      setAgentFormData({
        name: agent.name,
        country: agent.country || '',
        city: agent.city || '',
        subcity: agent.subcity || '',
        woreda: agent.woreda || '',
        houseNo: agent.houseNo || '',
        telephone: agent.telephone || '',
        email: agent.email || '',
        poBox: agent.poBox || '',
        fax: agent.fax || ''
      })
    } else {
      setEditingAgent(null)
      setAgentFormData({
        name: '',
        country: '',
        city: '',
        subcity: '',
        woreda: '',
        houseNo: '',
        telephone: '',
        email: '',
        poBox: '',
        fax: ''
      })
    }
    setAgentDialogOpen(true)
  }

  const handleAgentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgentFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleSaveAgent = async () => {
    setAgentFormLoading(true)
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, agentFormData)
        toast.success('Agent Updated', { description: 'Agent information has been saved.' })
      } else {
        await agentsApi.create(agentFormData)
        toast.success('Agent Created', { description: 'New agent has been added.' })
      }
      setAgentDialogOpen(false)
      fetchAgents()
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.error || 'Failed to save agent'
      })
    } finally {
      setAgentFormLoading(false)
    }
  }

  const fetchPendingAdmins = async () => {
    if (!isUserSuperAdmin) return
    try {
      setPendingLoading(true)
      const response = await authApi.listPendingAdmins()
      setPendingAdmins(response.admins || [])
    } catch (error) {
      console.error("Failed to load pending admins:", error)
    } finally {
      setPendingLoading(false)
    }
  }

  const handleApproveAdmin = async (adminId: string) => {
    try {
      setPendingProcessing(adminId)
      await authApi.approveAdmin(adminId)
      toast.success("Administrator approved successfully")
      setPendingAdmins(pendingAdmins.filter(a => a.id !== adminId))
    } catch (error) {
      toast.error("Failed to approve administrator")
    } finally {
      setPendingProcessing(null)
    }
  }

  const handleRejectAdmin = async (adminId: string) => {
    try {
      setPendingProcessing(adminId)
      await authApi.rejectAdmin(adminId)
      toast.success("Administrator rejected")
      setPendingAdmins(pendingAdmins.filter(a => a.id !== adminId))
    } catch (error) {
      toast.error("Failed to reject administrator")
    } finally {
      setPendingProcessing(null)
    }
  }

  useEffect(() => {
    if (isUserSuperAdmin) {
      fetchPendingAdmins()
    }
  }, [isUserSuperAdmin])

  const filteredPendingAdmins = useMemo(() => 
    pendingAdmins.filter(admin => 
      !pendingSearch || 
      admin.full_name?.toLowerCase().includes(pendingSearch.toLowerCase()) ||
      admin.email?.toLowerCase().includes(pendingSearch.toLowerCase()) ||
      admin.firm_name?.toLowerCase().includes(pendingSearch.toLowerCase())
    ),
    [pendingAdmins, pendingSearch]
  )

  const handleDeleteAgent = (id: string) => {
    setAgentToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return
    try {
      await agentsApi.delete(agentToDelete)
      toast.success('Agent Deleted', { description: 'Agent has been removed.' })
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
      fetchAgents()
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.error || 'Failed to delete agent'
      })
    }
  }

  const handleStart2FASetup = async () => {
    setTotpLoading(true)
    try {
      const response = await authApi.setup2FA()
      setTotpSecret(response.secret)
      setTotpUri(response.totpUri)
      setSetupDialogOpen(true)
      setVerifyCode('')
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.message || 'Failed to setup 2FA'
      })
    } finally {
      setTotpLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }
    setTotpLoading(true)
    try {
      const response = await authApi.verify2FA(verifyCode)
      setBackupCodes(response.backupCodes)
      setShowBackupCodes(true)
      setSetupDialogOpen(false)
      setTotpEnabled(true)
      toast.success('2FA Enabled', { description: 'Two-factor authentication is now enabled.' })
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.message || 'Invalid code. Please try again.'
      })
    } finally {
      setTotpLoading(false)
    }
  }

  const handleDisable2FA = () => {
    setDisableDialogOpen(true)
    setDisableCode('')
  }

  const handleConfirmDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast.error("Please enter a 6-digit code")
      return
    }
    setTotpLoading(true)
    try {
      await authApi.disable2FA(disableCode)
      setTotpEnabled(false)
      setDisableDialogOpen(false)
      setDisableCode('')
      toast.success('2FA Disabled', { description: 'Two-factor authentication has been disabled.' })
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.message || 'Invalid code. Please try again.'
      })
    } finally {
      setTotpLoading(false)
    }
  }

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast.success('Copied', { description: 'Backup codes copied to clipboard' })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authService.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        firmName: formData.firmName
      })
      
      if (user) {
        login({
          ...user,
          full_name: formData.fullName,
          phone: formData.phone,
          firm_name: formData.firmName
        })
      }

      toast.success('Profile Updated', { description: 'Your profile information has been saved.' })
      setIsEditing(false)
    } catch (error: any) {
      toast.error('Error', { 
        description: error.response?.data?.message || 'Failed to update profile'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      return toast.error('Error', { description: 'Passwords do not match' })
    }
    setLoading(true)
    try {
      await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      })
      toast.success('Password Changed', { description: 'Your password has been updated successfully.' })
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }))
    } catch (error: any) {
      toast.error('Error', { 
        description: error.response?.data?.message || 'Failed to change password'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex flex-col gap-10 p-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <Typography.h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            Account Settings
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">
              v2.0
            </Badge>
          </Typography.h1>
          <Typography.muted className="text-lg font-medium mt-2">
            Manage your professional identity, firm credentials and systemic security protocols.
          </Typography.muted>
        </div>
        <HelpButton pageId="profile" />
      </header>

      <Tabs defaultValue="profile" className="w-full space-y-8" data-tour="tabs-container">
        <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-border/50 h-auto flex-wrap justify-start gap-1">
          <TabsTrigger data-tour="profile-tab" value="profile" className="rounded-xl px-6 py-2.5 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Profile</TabsTrigger>
          <TabsTrigger data-tour="company-tab" value="company" className="rounded-xl px-6 py-2.5 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Company</TabsTrigger>
          <TabsTrigger data-tour="security-tab" value="security" className="rounded-xl px-6 py-2.5 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Security</TabsTrigger>
          {isUserSuperAdmin && <TabsTrigger value="agents" className="rounded-xl px-6 py-2.5 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Agents</TabsTrigger>}
          {isUserSuperAdmin && <TabsTrigger value="pending" className="rounded-xl px-6 py-2.5 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">Pending Admins</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight uppercase">Identity Profile</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground/80">Your systemic identification and contact protocols.</CardDescription>
                  </div>
                </div>
                {!isEditing && (
                  <Button data-tour="edit-button" onClick={() => setIsEditing(true)} variant="outline" className="rounded-xl font-black text-[11px] uppercase tracking-widest px-6 h-11 border-border/50 shadow-sm hover:shadow-md transition-all">
                    <Edit2 className="mr-2 size-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleUpdateProfile} className="space-y-8">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="fullName" 
                        value={formData.fullName} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-12 h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                        placeholder="Systemic full name" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Email Protocol</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        disabled={true}
                        className="pl-12 h-14 rounded-2xl border-border/50 bg-muted/30 font-bold text-muted-foreground cursor-not-allowed"
                        placeholder="Authentication email" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Contact Phone</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-12 h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                        placeholder="Direct contact line" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="firmName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Legal Firm</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        id="firmName" 
                        value={formData.firmName} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-12 h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                        placeholder="Primary legal entity" 
                      />
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="rounded-xl font-bold px-6 h-12">
                      Discard Changes
                    </Button>
                    <Button type="submit" disabled={loading} className="rounded-xl font-black text-[11px] uppercase tracking-widest px-8 h-12 shadow-lg shadow-primary/20">
                      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      Save Updates
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border border-primary/20 rounded-3xl overflow-hidden group">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Assigned System Role</p>
                    <p className="text-xl font-black text-primary uppercase tracking-tight">{user?.role || 'User'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-primary/10">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Active Session</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Lock className="w-7 h-7" />
                </div>
                <div>
                  <CardTitle className="text-xl font-black tracking-tight uppercase">Credential Vault</CardTitle>
                  <CardDescription className="font-medium text-muted-foreground/80">Rotate your access credentials to maintain high-level security.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleChangePassword} className="space-y-8">
                <div className="space-y-2.5 max-w-md">
                  <label htmlFor="currentPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Current Password</label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={formData.currentPassword} 
                    onChange={handleChange}
                    autoComplete="current-password"
                    className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white transition-all"
                  />
                </div>
                <Separator className="opacity-50" />
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">New Password</label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={formData.newPassword} 
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Confirm New Password</label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={formData.confirmPassword} 
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="outline" disabled={loading} className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest border-border/50 shadow-sm hover:shadow-md transition-all">
                    {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Shield className="mr-2 size-4" />}
                    Rotate Credentials
                  </Button>
                </div>
              </form>
              
              <div className="mt-12 p-8 bg-muted/30 rounded-3xl border border-border/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                      totpEnabled ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-muted text-muted-foreground shadow-inner"
                    )}>
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <div>
                      <Typography.h3 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
                        Two-Factor Protocol
                        {totpEnabled && <Check className="size-5 text-emerald-500" strokeWidth={3} />}
                      </Typography.h3>
                      <Typography.muted className="font-medium">
                        {totpEnabled 
                          ? 'MFA protection active on your account.' 
                          : 'Implement biometric or code-based authentication layers.'}
                      </Typography.muted>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={totpEnabled ? 'default' : 'secondary'} className={cn(
                      "px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em]",
                      totpEnabled ? 'bg-emerald-600' : 'bg-muted-foreground/10'
                    )}>
                      {totpEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    
                    {!totpEnabled ? (
                      <Button onClick={handleStart2FASetup} disabled={totpLoading} className="rounded-xl h-11 px-6 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20">
                        {totpLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Key className="mr-2 size-4" />}
                        Enable 2FA
                      </Button>
                    ) : (
                      <Button onClick={handleDisable2FA} disabled={totpLoading} variant="destructive" className="rounded-xl h-11 px-6 font-black text-[11px] uppercase tracking-widest">
                        {totpLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                        Disable Protocol
                      </Button>
                    )}
                  </div>
                </div>
                
                {totpEnabled && (
                  <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-bold text-amber-700">
                    <AlertTriangle className="size-4 shrink-0" />
                    Secure your backup codes. Losing these will lock your systemic access permanently.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                    <Building className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight uppercase">Corporate Identity</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground/80">Global firm details used for systemic invoicing and legal documentation.</CardDescription>
                  </div>
                </div>
                {!isEditingCompany && (
                  <Button onClick={() => setIsEditingCompany(true)} variant="outline" className="rounded-xl font-black text-[11px] uppercase tracking-widest px-6 h-11 border-border/50 shadow-sm hover:shadow-md transition-all">
                    <Edit2 className="mr-2 size-4" />
                    Edit Company
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={async (e) => { 
                e.preventDefault()
                const success = await saveCompanySettings()
                if (success) {
                  toast.success('Company settings saved')
                  setIsEditingCompany(false)
                } else {
                  toast.error('Failed to save company settings')
                }
              }} className="space-y-8">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-2.5 md:col-span-2">
                    <label htmlFor="companyName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Official Company Name</label>
                    <Input 
                      id="companyName" 
                      value={companyInfo.companyName ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyName: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Legal entity name" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="companyAddress" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Headquarters Address</label>
                    <Input 
                      id="companyAddress" 
                      value={companyInfo.companyAddress ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyAddress: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Street address protocol" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="companyCity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">City & Jurisdiction</label>
                    <Input 
                      id="companyCity" 
                      value={companyInfo.companyCity ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyCity: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Addis Ababa, Ethiopia" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="companyEmail" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Corporate Email</label>
                    <Input 
                      id="companyEmail" 
                      type="email"
                      value={companyInfo.companyEmail ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyEmail: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="official@firm.com" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="companyPhone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Corporate Hotline</label>
                    <Input 
                      id="companyPhone" 
                      value={companyInfo.companyPhone ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyPhone: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="+251 91 123 4567" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="companyWebsite" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Digital Presence (URL)</label>
                    <Input 
                      id="companyWebsite" 
                      value={companyInfo.companyWebsite ?? ''} 
                      onChange={(e) => setCompanyInfo({ companyWebsite: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="www.firm-official.com" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <label htmlFor="taxId" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Tax ID / TIN Registry</label>
                    <Input 
                      id="taxId" 
                      value={companyInfo.taxId ?? ''} 
                      onChange={(e) => setCompanyInfo({ taxId: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Systemic tax registration" 
                      className="h-14 rounded-2xl border-border/50 bg-muted/10 font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-4 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Brand Assets (Logo)</label>
                    <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-muted/20 rounded-3xl border border-dashed border-border/50">
                      {companyInfo.logoUrl ? (
                        <div className="relative h-32 w-32 rounded-2xl border bg-white p-4 shadow-sm group/logo overflow-hidden">
                          <img 
                            src={companyInfo.logoUrl} 
                            alt="Company logo" 
                            className="w-full h-full object-contain transition-transform group-hover/logo:scale-110 duration-500"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      ) : (
                        <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-border/50 bg-white flex items-center justify-center text-muted-foreground/20">
                          <Building className="size-12" />
                        </div>
                      )}
                      
                      <div className="flex-1 space-y-4 text-center md:text-left">
                        <Input 
                          id="logoUrl" 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!isEditingCompany}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              try {
                                const { settingsApi } = await import('@/api/settings')
                                const response = await settingsApi.uploadLogo(file)
                                if (response.data && response.data.logoUrl) {
                                  setCompanyInfo({ logoUrl: response.data.logoUrl })
                                  toast.success('Logo uploaded successfully')
                                }
                              } catch (error) {
                                console.error('Logo upload failed:', error)
                                toast.error('Failed to upload logo')
                              }
                            }
                          }}
                        />
                        <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                          <Button 
                            asChild 
                            variant="outline" 
                            disabled={!isEditingCompany}
                            className={cn(
                              "rounded-xl h-11 px-6 font-black text-[11px] uppercase tracking-widest border-border/50 transition-all",
                              !isEditingCompany && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <label htmlFor="logoUrl" className="cursor-pointer flex items-center gap-2">
                              <Building className="size-4" />
                              Upload Brand Mark
                            </label>
                          </Button>
                        </div>
                        <Typography.muted className="text-xs font-medium">
                          Supported formats: High-fidelity PNG or JPG (Max 2MB).
                        </Typography.muted>
                      </div>
                    </div>
                  </div>
                </div>

                {isEditingCompany && (
                  <div className="flex justify-end gap-3 pt-6">
                    <Button onClick={() => setIsEditingCompany(false)} variant="ghost" className="rounded-xl font-bold px-6 h-12">
                      Discard Changes
                    </Button>
                    <Button type="submit" className="rounded-xl font-black text-[11px] uppercase tracking-widest px-8 h-12 shadow-lg shadow-primary/20">
                      <Save className="mr-2 size-4" />
                      Save System Settings
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight uppercase">External Agents</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground/80">Authorized trademark agents and legal representatives.</CardDescription>
                  </div>
                </div>
                <Button onClick={() => handleOpenAgentDialog()} className="rounded-xl font-black text-[11px] uppercase tracking-widest px-6 h-11 shadow-lg shadow-primary/20">
                  <Plus className="mr-2 size-4" strokeWidth={3} />
                  Register Agent
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {agentsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="size-10 animate-spin text-primary/40" />
                  <Typography.muted className="font-black uppercase tracking-[0.2em] text-[10px]">Accessing Agent Registry...</Typography.muted>
                </div>
              ) : agents.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <Card key={agent.id} className="group border-none shadow-sm bg-muted/20 rounded-2xl overflow-hidden hover:shadow-md hover:bg-white hover:ring-1 hover:ring-primary/10 transition-all duration-300">
                      <div className="p-6">
                        <div className="flex justify-between items-start gap-4 mb-4">
                          <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-border/50 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                            <Typography.h3 className="text-lg font-black uppercase">{agent.name.charAt(0)}</Typography.h3>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenAgentDialog(agent)}
                              className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteAgent(agent.id)}
                              className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-black text-sm tracking-tight uppercase group-hover:text-primary transition-colors truncate">{agent.name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-2">
                              <MapPin className="size-3" />
                              {agent.city || 'N/A'}, {agent.country || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="space-y-2 pt-4 border-t border-border/50">
                            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                              <Mail className="size-3.5 text-primary/60" />
                              <span className="truncate">{agent.email || 'No email recorded'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                              <Phone className="size-3.5 text-primary/60" />
                              <span>{agent.telephone || 'No phone recorded'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/10 rounded-3xl border border-dashed border-border/50">
                  <Briefcase size={64} className="text-muted-foreground/20 mb-6" />
                  <Typography.h3 className="text-muted-foreground uppercase font-black tracking-tight">Agent Registry Empty</Typography.h3>
                  <Typography.muted className="mt-2 font-medium">No external representatives have been authorized yet.</Typography.muted>
                  <Button onClick={() => handleOpenAgentDialog()} variant="outline" className="mt-8 rounded-xl border-border/50 font-black text-[10px] uppercase tracking-widest">
                    Add First Agent
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-premium border-none rounded-3xl overflow-hidden bg-white">
            <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <UserPlus className="w-7 h-7" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight uppercase">Approval Queue</CardTitle>
                    <CardDescription className="font-medium text-muted-foreground/80">Review and authorize systemic administrator candidates.</CardDescription>
                  </div>
                </div>
                <div className="relative w-full sm:max-w-xs group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                  <Input 
                    placeholder="Search candidates..." 
                    className="pl-12 h-11 rounded-xl border-border/50 bg-white font-bold text-sm focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              {pendingLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : filteredPendingAdmins.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
                    <Check className="size-10 text-muted-foreground/30" strokeWidth={3} />
                  </div>
                  <Typography.h3 className="text-muted-foreground uppercase font-black tracking-tight">Queue All Clear</Typography.h3>
                  <Typography.muted className="mt-2 font-medium">
                    {pendingSearch ? "No candidates matching your search criteria." : "All administrator requests have been processed."}
                  </Typography.muted>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredPendingAdmins.map((admin) => (
                    <Card key={admin.id} className="group border-none shadow-sm bg-muted/20 rounded-3xl overflow-hidden hover:bg-white hover:shadow-md hover:ring-1 hover:ring-primary/10 transition-all duration-300">
                      <div className="p-8">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                          <div className="flex items-center gap-6 flex-1">
                            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-500 shadow-inner">
                              <span className="font-black text-2xl">
                                {admin.full_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-black text-xl tracking-tight uppercase truncate">{admin.full_name}</h4>
                                <Badge variant="outline" className={cn(
                                  "px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                  admin.rejection_count > 0 ? "border-amber-200 text-amber-600 bg-amber-50" : "border-primary/20 text-primary bg-primary/5"
                                )}>
                                  {admin.rejection_count > 0 ? `Flagged (${admin.rejection_count})` : "Fresh Entry"}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                  <Mail className="w-4 h-4 text-primary/60" />
                                  {admin.email}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                  <Building className="w-4 h-4 text-primary/60" />
                                  {admin.firm_name || 'Individual Entity'}
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                  <Clock className="w-4 h-4 text-primary/60" />
                                  Entry: {new Date(admin.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 lg:border-l lg:border-border/50 lg:pl-8">
                            <Button
                              onClick={() => handleApproveAdmin(admin.id)}
                              disabled={pendingProcessing === admin.id}
                              className="rounded-xl font-black text-[11px] uppercase tracking-widest px-8 h-12 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Check size={18} className="mr-2" strokeWidth={3} />
                              Authorize
                            </Button>
                            <Button
                              onClick={() => handleRejectAdmin(admin.id)}
                              disabled={pendingProcessing === admin.id}
                              variant="outline"
                              className="rounded-xl font-black text-[11px] uppercase tracking-widest px-8 h-12 border-destructive/20 text-destructive hover:bg-destructive/5"
                            >
                              <X size={18} className="mr-2" strokeWidth={3} />
                              Reject
                            </Button>
                          </div>
                        </div>
                        
                        {admin.rejection_count > 0 && (
                          <div className="mt-6 flex items-center gap-3 px-5 py-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-[11px] font-black text-amber-600 uppercase tracking-tight">
                            <AlertTriangle className="size-4 shrink-0" />
                            Security Warning: This candidate has been flagged {admin.rejection_count}/3 times by supervisors.
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs and Modals - Polish their content too */}
      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Briefcase size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight uppercase">
                  {editingAgent ? 'Edit Agent Protocol' : 'Register New Agent'}
                </DialogTitle>
                <DialogDescription className="font-medium">Define systemic authorization and contact details.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2.5">
              <label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Official Name *</label>
              <Input 
                id="name" 
                value={agentFormData.name} 
                onChange={handleAgentFormChange}
                placeholder="Agent or legal firm name"
                className="h-12 rounded-xl border-border/50 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label htmlFor="country" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Jurisdiction</label>
                <CountrySelector 
                  value={agentFormData.country}
                  onChange={(value) => setAgentFormData(prev => ({ ...prev, country: value }))}
                  placeholder="Select country"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Primary City</label>
                <Input 
                  id="city" 
                  value={agentFormData.city} 
                  onChange={handleAgentFormChange}
                  placeholder="City"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label htmlFor="subcity" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Subcity</label>
                <Input 
                  id="subcity" 
                  value={agentFormData.subcity} 
                  onChange={handleAgentFormChange}
                  placeholder="Subcity"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="woreda" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Woreda / District</label>
                <Input 
                  id="woreda" 
                  value={agentFormData.woreda} 
                  onChange={handleAgentFormChange}
                  placeholder="Woreda"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label htmlFor="houseNo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">House Number</label>
                <Input 
                  id="houseNo" 
                  value={agentFormData.houseNo} 
                  onChange={handleAgentFormChange}
                  placeholder="Official number"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="poBox" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">PO Box Protocol</label>
                <Input 
                  id="poBox" 
                  value={agentFormData.poBox} 
                  onChange={handleAgentFormChange}
                  placeholder="Postal identifier"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <label htmlFor="telephone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Contact Telephone</label>
                <Input 
                  id="telephone" 
                  value={agentFormData.telephone} 
                  onChange={handleAgentFormChange}
                  placeholder="Direct line"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
              <div className="space-y-2.5">
                <label htmlFor="fax" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Fax Interface</label>
                <Input 
                  id="fax" 
                  value={agentFormData.fax} 
                  onChange={handleAgentFormChange}
                  placeholder="Fax number"
                  className="h-12 rounded-xl border-border/50 font-bold"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Digital Protocol (Email)</label>
              <Input 
                id="email" 
                type="email"
                value={agentFormData.email} 
                onChange={handleAgentFormChange}
                placeholder="official@agent-firm.com"
                className="h-12 rounded-xl border-border/50 font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setAgentDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Discard
            </Button>
            <Button onClick={handleSaveAgent} disabled={agentFormLoading} className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20">
              {agentFormLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              {editingAgent ? 'Update Registry' : 'Confirm Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md mx-3 sm:mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-8 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                  <Trash2 size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight uppercase">
                    Delete Agent Protocol
                  </DialogTitle>
                </div>
              </div>
            </DialogHeader>
            <div className="p-8">
              <p className="font-medium text-muted-foreground">
                Are you absolutely certain you wish to decommission this agent? This action will permanently remove the entity from the systemic registry and cannot be reversed.
              </p>
            </div>
            <DialogFooter className="p-8 border-t border-border/50 bg-muted/20">
              <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteAgent} className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-destructive/20">
                <Trash2 className="mr-2 size-4" />
                Confirm Deletion
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-md mx-3 sm:mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Smartphone size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight uppercase">
                  MFA Protocol Setup
                </DialogTitle>
                <DialogDescription className="font-medium">Implement biometric or code-based authentication.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Scan this high-fidelity QR code with your systemic authenticator app.</p>
              <div className="flex justify-center p-6 bg-white rounded-2xl border border-border/50 shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`} 
                  alt="QR Code" 
                  className="w-40 h-40"
                />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Manual Interface Key</p>
                <code className="text-xs font-black tracking-wider text-primary break-all">{totpSecret}</code>
              </div>
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Verification Code</label>
              <Input 
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                maxLength={6}
                className="h-14 rounded-2xl border-border/50 bg-muted/10 font-black text-center text-2xl tracking-[0.5em] focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setSetupDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Cancel
            </Button>
            <Button onClick={handleVerify2FA} disabled={totpLoading || verifyCode.length !== 6} className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20">
              {totpLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Verify & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md mx-3 sm:mx-auto rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Key size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight uppercase">
                  Safety Backup Protocol
                </DialogTitle>
                <DialogDescription className="font-medium text-amber-600">Secure these emergency access keys.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-xs font-bold text-amber-700 leading-relaxed">
              <strong>CRITICAL:</strong> Store these codes in a systemic vault. If you lose access to your primary authenticator, these are your final recovery vectors. Each code is for single use.
            </div>
            <div className="grid grid-cols-2 gap-3">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-muted/30 px-4 py-3 rounded-xl font-black font-mono text-center text-primary text-sm tracking-wider border border-border/50">
                  {code}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={handleCopyBackupCodes} className="rounded-xl font-bold h-12 px-6">
              Copy to Vault
            </Button>
            <Button onClick={() => setShowBackupCodes(false)} className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20">
              Protocols Secured
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive">
                <AlertTriangle size={24} />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight uppercase">
                  Deactivate Security
                </DialogTitle>
                <DialogDescription className="font-medium text-destructive">Degrading account protection level.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="p-5 bg-destructive/5 border border-destructive/20 rounded-2xl text-xs font-bold text-destructive leading-relaxed">
              <strong>WARNING:</strong> Removing MFA protocols will leave your account with only password-based security. This increases systemic vulnerability significantly.
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Authentication Key</label>
              <Input 
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000 000"
                maxLength={6}
                className="h-14 rounded-2xl border-border/50 bg-muted/10 font-black text-center text-2xl tracking-[0.5em] focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
              />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-center mt-3">
                Input the 6-digit code or a single backup key.
              </p>
            </div>
          </div>
          <DialogFooter className="p-8 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setDisableDialogOpen(false)} className="rounded-xl font-bold h-12 px-6">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDisable2FA} 
              disabled={totpLoading || disableCode.length !== 6}
              className="rounded-xl h-12 px-8 font-black text-[11px] uppercase tracking-widest shadow-lg shadow-destructive/20"
            >
              {totpLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Disable Protocol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
