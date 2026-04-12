import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'

interface Permission {
  name: string
  description: string
}

interface RolePermissions {
  [role: string]: boolean
}

const PERMISSIONS: Permission[] = [
  { name: 'View Trademarks', description: 'Can view all trademark cases' },
  { name: 'Create Trademarks', description: 'Can create new trademark applications' },
  { name: 'Edit Trademarks', description: 'Can modify existing trademark details' },
  { name: 'Delete Trademarks', description: 'Can soft-delete trademark cases' },
  { name: 'View Clients', description: 'Can view all client records' },
  { name: 'Create Clients', description: 'Can add new clients' },
  { name: 'Merge Clients', description: 'Can merge duplicate client records' },
  { name: 'View Invoices', description: 'Can view billing and invoices' },
  { name: 'Create Invoices', description: 'Can generate new invoices' },
  { name: 'Process Payments', description: 'Can mark invoices as paid' },
  { name: 'Manage Deadlines', description: 'Can view and update deadlines' },
  { name: 'Access Trash', description: 'Can view and restore deleted items' },
  { name: 'Purge Data', description: 'Can permanently delete data' },
  { name: 'Export Reports', description: 'Can export data and reports' },
  { name: 'Manage Users', description: 'Can create and edit user accounts' },
  { name: 'View Audit Logs', description: 'Can access system audit logs' },
  { name: 'System Settings', description: 'Can modify system configuration' },
]

const ROLE_MATRIX: RolePermissions[] = [
  { 'Admin': true },
  { 'super_admin': true },
  { 'attorney': true },
  { 'paralegal': true },
  { 'billing': true },
  { 'readonly': true },
]

const ALL_ROLES = ['Admin', 'Super Admin', 'Paralegal', 'Billing', 'Read Only']

export function RBACMatrix({ userRole }: { userRole?: string }) {
  const permissionMatrix: { [permission: string]: { [role: string]: 'yes' | 'no' | 'partial' } } = {
    'View Trademarks': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'yes', 'Read Only': 'yes' },
    'Create Trademarks': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'partial', 'Billing': 'no', 'Read Only': 'no' },
    'Edit Trademarks': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'partial', 'Billing': 'no', 'Read Only': 'no' },
    'Delete Trademarks': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'View Clients': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'yes', 'Read Only': 'yes' },
    'Create Clients': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'no', 'Read Only': 'no' },
    'Merge Clients': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'View Invoices': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'yes', 'Read Only': 'yes' },
    'Create Invoices': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'yes', 'Read Only': 'no' },
    'Process Payments': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'yes', 'Read Only': 'no' },
    'Manage Deadlines': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'no', 'Read Only': 'yes' },
    'Access Trash': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'Purge Data': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'Export Reports': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'yes', 'Billing': 'yes', 'Read Only': 'yes' },
    'Manage Users': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'View Audit Logs': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
    'System Settings': { 'Admin': 'yes', 'Super Admin': 'yes', 'Paralegal': 'no', 'Billing': 'no', 'Read Only': 'no' },
  }

  const getStatusIcon = (status: 'yes' | 'no' | 'partial') => {
    if (status === 'yes') return <Check className="size-4 text-green-500" />
    if (status === 'partial') return <Minus className="size-4 text-amber-500" />
    return <X className="size-4 text-red-400" />
  }

  const getCellColor = (status: 'yes' | 'no' | 'partial') => {
    if (status === 'yes') return 'bg-green-500/10 hover:bg-green-500/20'
    if (status === 'partial') return 'bg-amber-500/10 hover:bg-amber-500/20'
    return 'bg-red-500/5 hover:bg-red-500/10'
  }

  const getRoleBadgeVariant = (role: string) => {
    if (role === 'Admin' || role === 'Super Admin') return 'default'
    if (role === 'Paralegal' || role === 'Billing') return 'secondary'
    return 'outline'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Role Permissions Matrix
        </CardTitle>
        <CardDescription>
          Visual overview of what each role can do in the system.
          {userRole && (
            <span className="block mt-1">
              Your role: <Badge variant="outline" className="ml-1 font-semibold">{userRole}</Badge>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-48">Permission</th>
                {ALL_ROLES.map(role => (
                  <th key={role} className="text-center py-3 px-2 font-medium">
                    <Badge variant={getRoleBadgeVariant(role)} className="text-xs">{role}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm) => (
                <tr key={perm.name} className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="text-left cursor-help">
                          <span className="font-medium">{perm.name}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>{perm.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  {ALL_ROLES.map(role => {
                    const status = permissionMatrix[perm.name]?.[role] || 'no'
                    return (
                      <td key={role} className="text-center py-2 px-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className={`inline-flex items-center justify-center size-8 rounded-md transition-colors cursor-default ${getCellColor(status)}`}>
                                {getStatusIcon(status)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                {role}: {status === 'yes' ? 'Allowed' : status === 'partial' ? 'Limited' : 'Not Allowed'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-6 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Check className="size-3.5 text-green-500" /> Full Access
          </div>
          <div className="flex items-center gap-1.5">
            <Minus className="size-3.5 text-amber-500" /> Limited
          </div>
          <div className="flex items-center gap-1.5">
            <X className="size-3.5 text-red-400" /> No Access
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
