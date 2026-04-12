import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Typography } from '@/components/ui/typography'
import { User, Mail, Shield, Lock, Save, Loader2, Edit2, Phone, Building2, Trash2, Plus, Briefcase } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { authService } from '@/utils/api'
import { toast } from 'sonner'
import { ActivityHeatmap } from '@/components/ActivityHeatmap'
import { agentsApi, Agent } from '@/api/agents'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
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
  
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
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
  }, [])

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

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    try {
      await agentsApi.delete(id)
      toast.success('Agent Deleted', { description: 'Agent has been removed.' })
      fetchAgents()
    } catch (error: any) {
      toast.error('Error', {
        description: error.response?.data?.error || 'Failed to delete agent'
      })
    }
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
    <div className="w-full p-4 md:p-8 space-y-6 max-w-4xl mx-auto min-h-screen">
      <header className="flex items-center justify-between">
        <div>
          <Typography.h1a>Account Settings</Typography.h1a>
          <Typography.muted>Manage your profile information and security preferences.</Typography.muted>
        </div>
      </header>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
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
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Account Role</p>
                  <p className="text-sm text-muted-foreground uppercase">{user?.role || 'User'}</p>
                </div>
                <Badge variant="outline" className="bg-background">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5" />
                Security
              </CardTitle>
              <CardDescription>Change your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
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
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      value={formData.newPassword} 
                      onChange={handleChange}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
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

        <TabsContent value="activity" className="space-y-6">
          <ActivityHeatmap />
        </TabsContent>
      </Tabs>

      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit Agent' : 'Add New Agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name *</label>
              <Input 
                id="name" 
                value={agentFormData.name} 
                onChange={handleAgentFormChange}
                placeholder="Agent or firm name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="country" className="text-sm font-medium">Country</label>
                <Input 
                  id="country" 
                  value={agentFormData.country} 
                  onChange={handleAgentFormChange}
                  placeholder="Country"
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <label htmlFor="subcity" className="text-sm font-medium">Subcity</label>
                <Input 
                  id="subcity" 
                  value={agentFormData.subcity} 
                  onChange={handleAgentFormChange}
                  placeholder="Subcity"
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <label htmlFor="houseNo" className="text-sm font-medium">House No</label>
                <Input 
                  id="houseNo" 
                  value={agentFormData.houseNo} 
                  onChange={handleAgentFormChange}
                  placeholder="House number"
                />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
                <label htmlFor="telephone" className="text-sm font-medium">Telephone</label>
                <Input 
                  id="telephone" 
                  value={agentFormData.telephone} 
                  onChange={handleAgentFormChange}
                  placeholder="Telephone"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="fax" className="text-sm font-medium">Fax</label>
                <Input 
                  id="fax" 
                  value={agentFormData.fax} 
                  onChange={handleAgentFormChange}
                  placeholder="Fax"
                />
              </div>
            </div>
            <div className="space-y-2">
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
    </div>
  )
}
