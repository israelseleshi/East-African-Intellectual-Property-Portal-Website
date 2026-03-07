import { createBrowserRouter, Navigate, Outlet, useNavigate } from 'react-router-dom'

import AppShell from './AppShell'
import DashboardPage from '../pages/DashboardPage'
import DocketPage from '../pages/DocketPage'
import ClientsPage from '../pages/ClientsPage'
import ClientDetailPage from '../pages/ClientDetailPage'
import NewClientPage from '../pages/NewClientPage'
import CaseFlowPage from '../pages/CaseFlowPage'
import CaseFlowDemoPage from '../pages/CaseFlowDemoPage'
import ReportsPage from '../pages/ReportsPage'
import TrademarkDetailPage from '../pages/TrademarkDetailPage'
import TrademarkDetailInfoPage from '../pages/TrademarkDetailInfoPage'
import DeadlinesPage from '../pages/DeadlinesPage'

import BillingPage from '../pages/BillingPage'
import LoginPage from '../pages/LoginPage'
import SignUpPage from '../pages/SignUpPage'
import VerifyOtpPage from '../pages/VerifyOtpPage'
import FormInspectorPage from '../pages/FormInspectorPage'
import HelpPage from '../pages/HelpPage'
import TrashPage from '../pages/TrashPage'
import NotificationsPage from '../pages/NotificationsPage'
import { useAuthStore } from '../store/authStore'
import ErrorPage from '../components/ErrorPage'

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

const VerifyOtpPageWrapper = () => {
  const navigate = useNavigate()
  const email = useAuthStore((state) => state.email)
  if (!email) {
    navigate('/signup');
    return null;
  }
  return <VerifyOtpPage />
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/signup',
    element: <SignUpPage />,
    errorElement: <ErrorPage />
  },
  {
    path: '/verify-otp',
    element: <VerifyOtpPageWrapper />,
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
          { index: true, element: <DashboardPage /> },
          { path: 'trademarks', element: <DocketPage /> },
          { path: 'trademarks/:id', element: <TrademarkDetailPage /> },
          { path: 'trademarks/:id/detail', element: <TrademarkDetailInfoPage /> },
          { path: 'deadlines', element: <DeadlinesPage /> },
          { path: 'intake/new', element: <Navigate to="/eipa-forms" replace /> },
          { path: 'eipa-forms', element: <FormInspectorPage /> },
          { path: 'clients', element: <ClientsPage /> },
          { path: 'clients/new', element: <NewClientPage /> },
          { path: 'clients/:id', element: <ClientDetailPage /> },
          { path: 'case-flow/:id', element: <CaseFlowPage /> },
          { path: 'case-flow/demo', element: <CaseFlowDemoPage /> },
          { path: 'invoicing', element: <BillingPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'trash', element: <TrashPage /> },
          { path: 'help', element: <HelpPage /> }
        ]
      }
    ]
  }
])
