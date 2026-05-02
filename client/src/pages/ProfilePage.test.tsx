import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfilePage from './ProfilePage'
import { agentsApi } from '@/api/agents'

// Mock all dependencies
jest.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: { id: '1', full_name: 'Test User', email: 'test@example.com', role: 'ADMIN', phone: '', firm_name: '' }
  })
}))

jest.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({
    companyInfo: {},
    setCompanyInfo: jest.fn(),
    fetchCompanySettings: jest.fn(),
    saveCompanySettings: jest.fn().mockResolvedValue(true),
    settingsSaving: false,
    settingsLoading: false
  })
}))

jest.mock('@/utils/api', () => ({
  authService: {
    me: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn()
  }
}))

jest.mock('@/api/agents', () => ({
  agentsApi: {
    list: jest.fn().mockResolvedValue({ success: true, data: [
      { id: '1', name: 'Agent 1', country: 'Kenya', city: 'Nairobi', email: 'agent@test.com', telephone: '123456' }
    ] }),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}))

jest.mock('@/api/auth', () => ({
  authApi: {
    get2FAStatus: jest.fn().mockResolvedValue({ totp_enabled: false }),
    listPendingAdmins: jest.fn().mockResolvedValue({ admins: [] }),
    approveAdmin: jest.fn(),
    rejectAdmin: jest.fn(),
    setup2FA: jest.fn(),
    verify2FA: jest.fn(),
    disable2FA: jest.fn()
  }
}))

describe('ProfilePage - Agent Deletion (Critical Fix)', () => {
  test('opens shadcn Dialog for agent deletion instead of native confirm()', async () => {
    // RED: This test will fail because current code uses window.confirm()
    
    // Spy on window.confirm to ensure it's NOT called
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true)
    
    render(<ProfilePage />)
    
    // Wait for agents to load
    await waitFor(() => {
      expect(screen.getByText('Agent 1')).toBeInTheDocument()
    })
    
    // Find and click the delete button
    const deleteButtons = screen.getAllByRole('button')
    const deleteButton = deleteButtons.find(btn => 
      btn.querySelector('[data-testid="trash-icon"]') || 
      btn.innerHTML.includes('Trash2')
    )
    
    if (deleteButton) {
      fireEvent.click(deleteButton)
      
      // Verify native confirm was NOT called
      expect(confirmSpy).not.toHaveBeenCalled()
      
      // Verify shadcn Dialog appeared instead
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/delete agent/i)).toBeInTheDocument()
    }
    
    confirmSpy.mockRestore()
  })
})
