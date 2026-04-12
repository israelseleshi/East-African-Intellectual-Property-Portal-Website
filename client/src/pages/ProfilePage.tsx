import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Shield, Lock, Save, Loader2, Edit2, Phone, Building2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { authService } from '@/utils/api'
import { toast } from 'sonner'

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

  // Initialize with user data if available
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
      // If store is empty, fetch fresh data from /me
      authService.me().then(data => {
        if (data) {
          login(data);
        }
      }).catch(() => {});
    }
  }, [user, login])

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
      
      // Update local store
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
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile information and security preferences.</p>
        </div>
      </header>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Information */}
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
                        disabled={true} // Email usually fixed
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

          {/* Role/Account Details */}
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
          {/* Password Management */}
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
      </Tabs>
    </div>
  )
}
