import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { User, Mail, Shield, Lock, Save, Loader2, Edit2, Phone, Building2, Trash2, Plus, Briefcase, Key, Smartphone, AlertTriangle, UserPlus, Check, X, Search, Clock, Building, Eye, FileText } from 'lucide-react'
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

export default function ProfilePage() {
  const { user, login } = useAuthStore()
  const { companyInfo, setCompanyInfo, fetchCompanySettings, saveCompanySettings, settingsSaving, settingsLoading } = useSettingsStore()
  
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
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

  const generateInvoicePDF = async () => {
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const pdfDoc = await PDFDocument.create()
      const page = pdfDoc.addPage([595.28, 841.89])
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

      const marginLeft = 50
      const marginRight = 545
      let y = 800

      // Logo
      try {
        const logoSrc = companyInfo.logoUrl || '/eaip-logo.png'
        let logoImageBytes: ArrayBuffer
        if (logoSrc.startsWith('data:')) {
          const base64 = logoSrc.split(',')[1]
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          logoImageBytes = bytes.buffer
        } else {
          logoImageBytes = await fetch(logoSrc).then(res => res.arrayBuffer())
        }
        const logoImage = await pdfDoc.embedPng(new Uint8Array(logoImageBytes))
        const logoDims = logoImage.scale(0.125)
        page.drawImage(logoImage, {
          x: (595.28 - logoDims.width) / 2,
          y: y - logoDims.height,
          width: logoDims.width,
          height: logoDims.height,
        })
        y -= (logoDims.height + 15)
      } catch (e) {
        console.warn('Could not load logo for PDF', e)
        y -= 40
      }

      // Company info (centered)
      const companyInfoLines = [
        companyInfo.companyName || 'EAST AFRICAN INTELLECTUAL PROPERTY',
        companyInfo.companyAddress ? `${companyInfo.companyAddress}, ${companyInfo.companyCity || ''}` : 'Addis Ababa, Ethiopia',
        companyInfo.companyEmail && companyInfo.companyWebsite
          ? `Email: ${companyInfo.companyEmail} | Web: ${companyInfo.companyWebsite}`
          : `Email: ${companyInfo.companyEmail || 'info@eastafricanip.com'} | Web: ${companyInfo.companyWebsite || 'www.eastafricanip.com'}`,
      ]
      if (companyInfo.companyPhone) {
        companyInfoLines.push(`Phone: ${companyInfo.companyPhone}`)
      }
      if (companyInfo.taxId) {
        companyInfoLines.push(`Tax ID: ${companyInfo.taxId}`)
      }
      companyInfoLines.forEach((line, i) => {
        const fontSize = i === 0 ? 14 : 9
        const font = i === 0 ? boldFont : regularFont
        const textWidth = font.widthOfTextAtSize(line, fontSize)
        page.drawText(line, {
          x: (595.28 - textWidth) / 2,
          y,
          size: fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1)
        })
        y -= (fontSize + 5)
      })

      y -= 30
      page.drawLine({
        start: { x: marginLeft, y },
        end: { x: marginRight, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8)
      })
      y -= 40

      // INVOICE title
      page.drawText('INVOICE', {
        x: marginLeft,
        y,
        size: 24,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })

      const invoiceNo = 'No: INV-2026-001'
      const invNoWidth = boldFont.widthOfTextAtSize(invoiceNo, 12)
      page.drawText(invoiceNo, {
        x: marginRight - invNoWidth,
        y: y + 5,
        size: 12,
        font: boldFont
      })
      y -= 50

      // Client & Trademark Details
      const drawSectionTitle = (title: string, yPos: number) => {
        page.drawText(title.toUpperCase(), {
          x: marginLeft,
          y: yPos,
          size: 10,
          font: boldFont,
          color: rgb(0.4, 0.4, 0.4)
        })
        return yPos - 20
      }

      y = drawSectionTitle('Client & Trademark Details', y)

      const detailRows: Array<[string, string]> = [
        ['Client Name', 'Client Company Ltd.'],
        ['Trademark', 'Sample Trademark Registration']
      ]
      detailRows.forEach(([label, value]) => {
        page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont })
        page.drawText(value, { x: marginLeft + 120, y, size: 10, font: regularFont })
        y -= 18
      })

      y -= 20
      y = drawSectionTitle('Billing Schedule', y)
      const billingRows: Array<[string, string]> = [
        ['Issue Date', new Date().toLocaleDateString()],
        ['Due Date', '—'],
        ['Payment Method', 'Bank Transfer']
      ]
      billingRows.forEach(([label, value]) => {
        page.drawText(label, { x: marginLeft, y, size: 10, font: boldFont })
        page.drawText(value, { x: marginLeft + 120, y, size: 10, font: regularFont })
        y -= 18
      })

      y -= 30
      y = drawSectionTitle('Fee Details', y)

      // Table header
      page.drawRectangle({
        x: marginLeft,
        y: y - 5,
        width: marginRight - marginLeft,
        height: 20,
        color: rgb(0.96, 0.97, 0.98)
      })
      page.drawText('#', { x: marginLeft + 5, y, size: 9, font: boldFont })
      page.drawText('Description', { x: marginLeft + 30, y, size: 9, font: boldFont })
      page.drawText('Amount', { x: marginRight - 80, y, size: 9, font: boldFont })
      y -= 22

      // Table rows
      const items = [
        { desc: 'Trademark Registration - Class 25', amount: 1500 },
        { desc: 'Patent Filing - Utility Model', amount: 2500 },
      ]
      items.forEach((item, index) => {
        page.drawText(String(index + 1), { x: marginLeft + 5, y, size: 9, font: regularFont })
        page.drawText(item.desc, { x: marginLeft + 30, y, size: 9, font: regularFont })
        const amountText = `ETB ${item.amount.toLocaleString()}`
        page.drawText(amountText, { x: marginRight - 80, y, size: 9, font: regularFont })
        y -= 16
      })

      y -= 15

      // Total
      page.drawRectangle({
        x: marginLeft,
        y: y - 10,
        width: marginRight - marginLeft,
        height: 40,
        color: rgb(0.96, 0.97, 0.98)
      })

      page.drawText('TOTAL AMOUNT DUE', {
        x: marginLeft + 15,
        y: y + 5,
        size: 12,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })

      y -= 10

      const totalAmount = 'ETB 4,000'
      const totalWidth = boldFont.widthOfTextAtSize(totalAmount, 16)
      page.drawText(totalAmount, {
        x: marginRight - totalWidth - 15,
        y: y + 3,
        size: 16,
        font: boldFont,
        color: rgb(0.08, 0.16, 0.32)
      })

      y -= 60
      y -= 40
      page.drawLine({
        start: { x: marginRight - 180, y },
        end: { x: marginRight, y },
        thickness: 1,
        color: rgb(0.1, 0.1, 0.1)
      })
      y -= 12
      page.drawText('Authorized Signature', {
        x: marginRight - 145,
        y,
        size: 10,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1)
      })

      const pdfBytes = await pdfDoc.save()
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      setPreviewUrl(url)
      setPreviewOpen(true)
    } catch (error) {
      console.error('Failed to generate invoice PDF:', error)
    }
  }

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

  // Pending Admins handlers
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

  // 2FA Handlers
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

  const tabsClassName = isUserSuperAdmin 
    ? "grid w-full grid-cols-5 max-w-[650px]" 
    : "grid w-full grid-cols-2 max-w-[350px]"

  return (
    <div className="w-full flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
      <header className="flex items-center justify-between">
        <div>
          <Typography.h1a>Account Settings</Typography.h1a>
          <Typography.muted>Manage your profile information and security preferences.</Typography.muted>
        </div>
      </header>

      <Tabs defaultValue="profile" className="flex flex-col gap-6">
        <TabsList className={tabsClassName}>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          {isUserSuperAdmin && <TabsTrigger value="agents">Agents</TabsTrigger>}
          {isUserSuperAdmin && <TabsTrigger value="pending">Pending Admins</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <User className="size-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your account details and contact information.</CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit2 className="mr-2 size-4" />
                  Edit Profile
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="fullName" 
                        value={formData.fullName} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9"
                        placeholder="Enter full name" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        value={formData.email} 
                        disabled={true}
                        className="pl-9 bg-muted"
                        placeholder="Enter email" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9"
                        placeholder="Enter phone number" 
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="firmName" className="text-sm font-medium">Firm Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input 
                        id="firmName" 
                        value={formData.firmName} 
                        onChange={handleChange}
                        disabled={!isEditing}
                        className="pl-9"
                        placeholder="Enter firm name" 
                      />
                    </div>
                  </div>
                </div>
                
                {isEditing && (
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-none">Account Role</p>
                  <p className="text-sm text-muted-foreground uppercase">{user?.role || 'User'}</p>
                </div>
                <Badge variant="outline" className="bg-background">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="security" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5" />
                Security
              </CardTitle>
              <CardDescription>Change your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="currentPassword" className="text-sm font-medium">Current Password</label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={formData.currentPassword} 
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                </div>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={formData.newPassword} 
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      value={formData.confirmPassword} 
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" variant="outline" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Shield className="mr-2 size-4" />}
                    Update Password
                  </Button>
                </div>
              </form>
              
              <Separator className="my-6" />
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
<div className="flex flex-col gap-1">
                    <Typography.h3 className="flex items-center gap-2">
                      <Smartphone className="size-5" />
                      Two-Factor Authentication
                    </Typography.h3>
                    <Typography.muted>
                      {totpEnabled 
                        ? 'Your account is protected with 2FA' 
                        : 'Add an extra layer of security to your account'}
                    </Typography.muted>
                  </div>
                  <Badge variant={totpEnabled ? 'default' : 'secondary'} className={totpEnabled ? 'bg-green-600' : ''}>
                    {totpEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  {!totpEnabled ? (
                    <Button onClick={handleStart2FASetup} disabled={totpLoading} variant="outline">
                      {totpLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Key className="mr-2 size-4" />}
                      Enable 2FA
                    </Button>
                  ) : (
                    <Button onClick={handleDisable2FA} disabled={totpLoading} variant="destructive" size="sm">
                      {totpLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Disable 2FA
                    </Button>
                  )}
                </div>
                
                {totpEnabled && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    Don't lose access! Save backup codes when enabling 2FA.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <Building className="size-5" />
                  Company Information
                </CardTitle>
                <CardDescription>Update your company details for invoice headers and documents.</CardDescription>
              </div>
              <div className="flex gap-2">
                {!isEditingCompany && (
                  <Button onClick={() => setIsEditingCompany(true)} variant="outline" size="sm">
                    <Edit2 className="mr-2 size-4" />
                    Edit Company
                  </Button>
                )}
                {isEditingCompany && (
                  <Button onClick={generateInvoicePDF} variant="outline" size="sm" className="transition-colors hover:bg-muted">
                    <Eye className="mr-2 size-4" />
                    Preview Invoice
                  </Button>
                 )}
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => { 
                e.preventDefault()
                const success = await saveCompanySettings()
                if (success) {
                  toast.success('Company settings saved')
                  setIsEditingCompany(false)
                } else {
                  toast.error('Failed to save company settings')
                }
              }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                    <Input 
                      id="companyName" 
                      value={companyInfo.companyName} 
                      onChange={(e) => setCompanyInfo({ companyName: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Your company name" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyAddress" className="text-sm font-medium">Address</label>
                    <Input 
                      id="companyAddress" 
                      value={companyInfo.companyAddress} 
                      onChange={(e) => setCompanyInfo({ companyAddress: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Street address" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyCity" className="text-sm font-medium">City</label>
                    <Input 
                      id="companyCity" 
                      value={companyInfo.companyCity} 
                      onChange={(e) => setCompanyInfo({ companyCity: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Addis Ababa, Ethiopia" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyEmail" className="text-sm font-medium">Email</label>
                    <Input 
                      id="companyEmail" 
                      type="email"
                      value={companyInfo.companyEmail} 
                      onChange={(e) => setCompanyInfo({ companyEmail: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="info@company.com" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyPhone" className="text-sm font-medium">Phone</label>
                    <Input 
                      id="companyPhone" 
                      value={companyInfo.companyPhone} 
                      onChange={(e) => setCompanyInfo({ companyPhone: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="+251 91 123 4567" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyWebsite" className="text-sm font-medium">Website</label>
                    <Input 
                      id="companyWebsite" 
                      value={companyInfo.companyWebsite} 
                      onChange={(e) => setCompanyInfo({ companyWebsite: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="www.company.com" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="taxId" className="text-sm font-medium">Tax ID / Registration</label>
                    <Input 
                      id="taxId" 
                      value={companyInfo.taxId} 
                      onChange={(e) => setCompanyInfo({ taxId: e.target.value })}
                      disabled={!isEditingCompany}
                      placeholder="Tax identification number" 
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="logoUrl" className="text-sm font-medium">Company Logo</label>
                    <div className="flex items-center gap-4">
                      {companyInfo.logoUrl ? (
                        <div className="relative size-24 rounded-lg border overflow-hidden bg-muted">
                          <img 
                            src={companyInfo.logoUrl} 
                            alt="Company logo" 
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        </div>
                      ) : (
                        <div className="size-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                          <Building className="size-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input 
                          id="logoUrl" 
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={!isEditingCompany}
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onload = (event) => {
                                setCompanyInfo({ logoUrl: event.target?.result as string })
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <label 
                          htmlFor="logoUrl" 
                          className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium cursor-pointer transition-colors",
                            isEditingCompany 
                              ? "border-input bg-background hover:bg-muted" 
                              : "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Building className="size-4" />
                          {isEditingCompany ? "Upload Logo" : "Upload Logo"}
                        </label>
                        <p className="text-xs text-muted-foreground mt-2">
                          PNG, JPG up to 2MB. Preview above.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                {isEditingCompany && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => setIsEditingCompany(false)} variant="outline">
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="mr-2 size-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
              </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="agents" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="size-5" />
                  Agents
                </CardTitle>
                <CardDescription>Manage trademark agents and representatives.</CardDescription>
              </div>
              <Button onClick={() => handleOpenAgentDialog()} size="sm">
                <Plus className="mr-2 size-4" />
                Add Agent
              </Button>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : agents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telephone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.country || '-'}</TableCell>
                        <TableCell>{agent.city || '-'}</TableCell>
                        <TableCell>{agent.email || '-'}</TableCell>
                        <TableCell>{agent.telephone || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenAgentDialog(agent)}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteAgent(agent.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No agents found. Add your first agent to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Admins Tab */}
        <TabsContent value="pending" className="flex flex-col gap-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="size-5" />
                    Pending Administrators
                  </CardTitle>
                  <CardDescription>Review and approve new administrator accounts.</CardDescription>
                </div>
                <div className="relative flex-1 md:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input 
                    placeholder="Search administrators..." 
                    className="pl-9 bg-muted/50"
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    aria-label="Search administrators"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredPendingAdmins.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlus size={48} className="mx-auto text-muted-foreground mb-4" />
                  <Typography.h3>No Pending Administrators</Typography.h3>
                  <Typography.muted>
                    {pendingSearch ? "No administrators match your search." : "All administrator accounts have been reviewed."}
                  </Typography.muted>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredPendingAdmins.map((admin) => (
                    <Card key={admin.id} className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {admin.full_name?.charAt(0).toUpperCase()}
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
                            <Badge variant="default" className="text-xs">
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
                         {admin.is_approved !== 1 && admin.rejection_count < 3 && (
                           <>
                             <Button
                                 onClick={() => handleApproveAdmin(admin.id)}
                                 disabled={pendingProcessing === admin.id}
                                 size="sm"
                                 className="transition-colors hover:opacity-90"
                               >
                               <Check size={16} className="mr-1" />
                               Approve
                             </Button>
                             <Button
                                 onClick={() => handleRejectAdmin(admin.id)}
                                 disabled={pendingProcessing === admin.id}
                                 variant="destructive"
                                 size="sm"
                                 className="transition-colors"
                               >
                               <X size={16} className="mr-1" />
                               Reject
                             </Button>
                           </>
                         )}
                          {admin.is_approved === 1 && admin.rejection_count < 3 && (
                            <span className="text-xs text-muted-foreground italic">
                              Already approved
                            </span>
                          )}
                         </div>
                        </div>
                       </Card>
                     ))}
                  </div>
               )}
             </CardContent>
           </Card>
         </TabsContent>

       </Tabs>

        {/* Preview Invoice Dialog */}
        <Dialog open={previewOpen} onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open && previewUrl) {
            URL.revokeObjectURL(previewUrl)
            setPreviewUrl(null)
          }
        }}>
          <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-2">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Invoice Preview
              </DialogTitle>
              <DialogDescription>
                Live preview of your invoice with current company information
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-auto">
              {previewUrl ? (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full bg-white"
                  title="Invoice Preview"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button onClick={() => {
                setPreviewOpen(false)
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null)
                }
              }} variant="outline">
                Close
              </Button>
              <Button onClick={() => {
                setIsEditingCompany(true)
                setPreviewOpen(false)
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl)
                  setPreviewUrl(null)
                }
              }}>
                <Edit2 className="mr-2 size-4" />
                Edit Company Info
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit Agent' : 'Add New Agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">Name *</label>
              <Input 
                id="name" 
                value={agentFormData.name} 
                onChange={handleAgentFormChange}
                placeholder="Agent or firm name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="country" className="text-sm font-medium">Country</label>
                <CountrySelector 
                  value={agentFormData.country}
                  onChange={(value) => setAgentFormData(prev => ({ ...prev, country: value }))}
                  placeholder="Select country"
                  id="country"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="city" className="text-sm font-medium">City</label>
                <Input 
                  id="city" 
                  value={agentFormData.city} 
                  onChange={handleAgentFormChange}
                  placeholder="City"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="subcity" className="text-sm font-medium">Subcity</label>
                <Input 
                  id="subcity" 
                  value={agentFormData.subcity} 
                  onChange={handleAgentFormChange}
                  placeholder="Subcity"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="woreda" className="text-sm font-medium">Woreda</label>
                <Input 
                  id="woreda" 
                  value={agentFormData.woreda} 
                  onChange={handleAgentFormChange}
                  placeholder="Woreda"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="houseNo" className="text-sm font-medium">House No</label>
                <Input 
                  id="houseNo" 
                  value={agentFormData.houseNo} 
                  onChange={handleAgentFormChange}
                  placeholder="House number"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="poBox" className="text-sm font-medium">PO Box</label>
                <Input 
                  id="poBox" 
                  value={agentFormData.poBox} 
                  onChange={handleAgentFormChange}
                  placeholder="PO Box"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="telephone" className="text-sm font-medium">Telephone</label>
                <Input 
                  id="telephone" 
                  value={agentFormData.telephone} 
                  onChange={handleAgentFormChange}
                  placeholder="Telephone"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="fax" className="text-sm font-medium">Fax</label>
                <Input 
                  id="fax" 
                  value={agentFormData.fax} 
                  onChange={handleAgentFormChange}
                  placeholder="Fax"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email" 
                type="email"
                value={agentFormData.email} 
                onChange={handleAgentFormChange}
                placeholder="Email address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgent} disabled={agentFormLoading || !agentFormData.name}>
              {agentFormLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingAgent ? 'Save Changes' : 'Add Agent'}
            </Button>
          </DialogFooter>
      </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="size-5 text-destructive" />
                Delete Agent
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this agent? This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteAgent}>
                <Trash2 className="mr-2 size-4" />
                Delete Agent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2FA Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-5" />
              Setup Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-4">Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)</p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`} 
                  alt="QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Can't scan? Enter this code manually: <code className="bg-muted px-1 rounded">{totpSecret}</code>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Enter verification code</label>
              <Input 
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                className="text-center text-xl tracking-[0.5em]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleVerify2FA} disabled={totpLoading || verifyCode.length !== 6}>
              {totpLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="size-5" />
              Backup Codes
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Save these backup codes in a secure location. 
                Each code can only be used once if you lose access to your authenticator app.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code key={index} className="text-sm bg-muted px-2 py-1 rounded font-mono text-center">
                  {code}
                </code>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyBackupCodes}>
              Copy Codes
            </Button>
            <Button onClick={() => setShowBackupCodes(false)}>
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                <strong>Warning:</strong> Disabling 2FA will make your account less secure. 
                You'll only need your password to log in.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Enter authenticator code or backup code</label>
              <Input 
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                className="text-center text-xl tracking-[0.5em]"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your authenticator app or one of your backup codes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDisable2FA} 
              disabled={totpLoading || disableCode.length !== 6}
            >
              {totpLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
