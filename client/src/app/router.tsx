import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import AppShell from './AppShell'
import { useAuthStore, canAccessFinance } from '../store/authStore'
import ErrorPage from '../components/ErrorPage'

const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const DocketPage = lazy(() => import('../pages/DocketPage'))
const ClientsPage = lazy(() => import('../pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('../pages/ClientDetailPage'))
const NewClientPage = lazy(() => import('../pages/NewClientPage'))
const CaseFlowPage = lazy(() => import('../pages/CaseFlowPage'))
const CaseFlowDemoPage = lazy(() => import('../pages/CaseFlowDemoPage'))
const TrademarkDetailInfoPage = lazy(() => import('../pages/TrademarkDetailInfoPage'))
const DeadlinesPage = lazy(() => import('../pages/DeadlinesPage'))
const BillingPage = lazy(() => import('../pages/BillingPage'))
const InvoiceDetailPage = lazy(() => import('../pages/InvoiceDetailPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const SignUpPage = lazy(() => import('../pages/SignUpPage'))
const VerifyOtpPage = lazy(() => import('../pages/VerifyOtpPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const FormInspectorPage = lazy(() => import('../pages/FormInspectorPage'))
const HelpPage = lazy(() => import('../pages/HelpPage'))
const TrashPage = lazy(() => import('../pages/TrashPage'))

const withRouteSuspense = (node: ReactNode) => (
  <Suspense fallback={<div className="p-6 text-sm text-foreground/70">Loading page...</div>}>
    {node}
  </Suspense>
)

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

const FinanceRoute = () => {
  const user = useAuthStore((state) => state.user)
  if (user && !canAccessFinance(user)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

const TemporaryLoginPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Login Page</h1>
      <p className="text-muted-foreground">Coming soon - shadcn auth pages</p>
    </div>
  </div>
)

const TemporarySignupPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Sign Up Page</h1>
      <p className="text-muted-foreground">Coming soon - shadcn auth pages</p>
    </div>
  </div>
)

const TemporaryVerifyOtpPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Verify OTP Page</h1>
      <p className="text-muted-foreground">Coming soon - shadcn auth pages</p>
    </div>
  </div>
)

const VerifyOtpPageWrapper = () => {
  const email = useAuthStore((state) => state.email)
  if (!email) {
    return <Navigate to="/signup" replace />
  }
  return withRouteSuspense(<VerifyOtpPage />)
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withRouteSuspense(<LoginPage />),
    errorElement: <ErrorPage />
  },
  {
    path: '/signup',
    element: withRouteSuspense(<SignUpPage />),
    errorElement: <ErrorPage />
  },
  {
    path: '/signup/super_admin',
    element: withRouteSuspense(<SignUpPage />),
    errorElement: <ErrorPage />
  },
  {
    path: '/verify-otp',
    element: <VerifyOtpPageWrapper />,
    errorElement: <ErrorPage />
  },
  {
    path: '/forgot-password',
    element: withRouteSuspense(<ForgotPasswordPage />),
    errorElement: <ErrorPage />
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: withRouteSuspense(<DashboardPage />) },
          { path: 'trademarks', element: withRouteSuspense(<DocketPage />) },
          { path: 'trademarks/:id', element: withRouteSuspense(<TrademarkDetailInfoPage />) },
          { path: 'trademarks/:id/detail', element: withRouteSuspense(<TrademarkDetailInfoPage />) },
          { path: 'deadlines', element: withRouteSuspense(<DeadlinesPage />) },
          { path: 'intake/new', element: <Navigate to="/eipa-forms" replace /> },
          { path: 'eipa-forms', element: <Navigate to="application-form" replace /> },
          { path: 'eipa-forms/application-form', element: withRouteSuspense(<FormInspectorPage />) },
          { path: 'eipa-forms/renewal-form', element: withRouteSuspense(<FormInspectorPage />) },
          { path: 'clients', element: withRouteSuspense(<ClientsPage />) },
          { path: 'clients/new', element: withRouteSuspense(<NewClientPage />) },
          { path: 'clients/:id', element: withRouteSuspense(<ClientDetailPage />) },
          { path: 'case-flow/:id', element: withRouteSuspense(<CaseFlowPage />) },
          { path: 'case-flow/demo', element: withRouteSuspense(<CaseFlowDemoPage />) },
          { 
          path: 'invoicing', 
          element: <FinanceRoute />,
          children: [
            { index: true, element: withRouteSuspense(<BillingPage />) },
            { path: ':id', element: withRouteSuspense(<InvoiceDetailPage />) }
          ]
        },
          { path: 'trash', element: withRouteSuspense(<TrashPage />) },
          { path: 'help', element: withRouteSuspense(<HelpPage />) }
        ]
      }
    ]
  }
])
