import { Transaction } from '@/shared/database'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoiceService } from '../utils/api'
import { useToast } from '../components/ui/toast'
import {
  CreditCard,
  CurrencyDollar,
  ChartLineUp,
  ArrowUpRight,
  WarningCircle,
  Clock,
  Funnel,
  Download,
  Receipt
} from '@phosphor-icons/react'

import Joyride, { Step } from 'react-joyride'
import { useSearchParams } from 'react-router-dom'

export default function BillingPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const startTour = searchParams.get('tour') === 'true'

  const [currency] = useState<'USD' | 'ETB'>('USD')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    totalRevenue: number
    outstanding: number
    paidMtd: number
    clientCount: number
    overdueCount: number
  }>({
    totalRevenue: 0,
    outstanding: 0,
    paidMtd: 0,
    clientCount: 0,
    overdueCount: 0
  })

  const tourSteps: Step[] = [
    {
      target: '#billing-stats-grid',
      content: 'Track your financial health with real-time revenue and outstanding metrics.',
      placement: 'bottom' as const,
      disableBeacon: true,
    },
    {
      target: '#stat-revenue',
      content: 'Total Revenue shows all income generated from official and professional fees.',
      placement: 'bottom' as const,
    },
    {
      target: '#stat-outstanding',
      content: 'Keep an eye on Outstanding payments and Overdue invoices to maintain cash flow.',
      placement: 'bottom' as const,
    },
    {
      target: '#billing-ledger',
      content: 'The Ledger lists every transaction, linked directly to your trademark cases.',
      placement: 'top' as const,
    },
    {
      target: '#currency-switch',
      content: 'Instantly toggle between USD and ETB based on current exchange rates.',
      placement: 'bottom' as const,
    }
  ]

  const handleTourCallback = (data: { status: string }) => {
    const { status } = data
    if (['finished', 'skipped'].includes(status)) {
      searchParams.delete('tour')
      setSearchParams(searchParams)
    }
  }

  useEffect(() => {
    async function fetchTransactions() {
      try {
        const data = await invoiceService.getAll()
        
        // Use real data only
        const mappedTransactions = data.map((inv: { 
          id: string; 
          trademark_id?: string; 
          markId?: string; 
          mark_name?: string; 
          markName?: string; 
          client_name?: string; 
          type?: string; 
          total_amount?: number; 
          amount?: number; 
          currency: string; 
          status: string; 
          issue_date?: string; 
          date?: string; 
          payment_method?: string; 
          method?: string; 
        }) => ({
          id: inv.id,
          markId: inv.trademark_id || inv.markId || '',
          markName: inv.mark_name || inv.markName || inv.client_name,
          clientName: inv.client_name || 'Client',
          type: inv.type || 'INVOICE',
          amount: Number(inv.total_amount || inv.amount),
          currency: inv.currency,
          status: inv.status,
          date: new Date(inv.issue_date || inv.date || new Date()).toLocaleDateString(),
          method: inv.payment_method || inv.method || 'Bank Transfer'
        }))
        
        setTransactions(mappedTransactions)

        if (data.length > 0) {
          // Calculate dynamic stats from real data
          const totalRevenue = data.reduce((acc: number, inv: { total_amount?: number | string }) => acc + Number(inv.total_amount), 0)
          const outstanding = data
            .filter((inv: { status: string }) => inv.status !== 'PAID')
            .reduce((acc: number, inv: { total_amount?: number | string }) => acc + Number(inv.total_amount), 0)
          const paidMtd = data
            .filter((inv: { status: string; issue_date?: string }) => {
              const issueDate = inv.issue_date ? new Date(inv.issue_date) : new Date()
              const now = new Date()
              return inv.status === 'PAID' && 
                     issueDate.getMonth() === now.getMonth() && 
                     issueDate.getFullYear() === now.getFullYear()
            })
            .reduce((acc: number, inv: { total_amount?: number | string }) => acc + Number(inv.total_amount), 0)
          
          const uniqueClients = new Set(data.map((inv: { client_name?: string }) => inv.client_name)).size
          const overdueCount = data.filter((inv: { status: string }) => inv.status === 'OVERDUE').length

          setStats({
            totalRevenue,
            outstanding,
            paidMtd,
            clientCount: uniqueClients,
            overdueCount
          })
        } else {
          setStats({
            totalRevenue: 0,
            outstanding: 0,
            paidMtd: 0,
            clientCount: 0,
            overdueCount: 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        setTransactions([]);
        setStats({
          totalRevenue: 0,
          outstanding: 0,
          paidMtd: 0,
          clientCount: 0,
          overdueCount: 0
        })
      } finally {
        setLoading(false)
      }
    }
    fetchTransactions()
  }, [])

  const formatAmount = (val: number) => {
    if (currency === 'ETB') {
      return (val * 120).toLocaleString() + ' ETB'
    }
    return '$' + val.toLocaleString()
  }

  const handleDownload = (mark: string) => {
    addToast({
      title: 'Downloading Invoice',
      description: `Downloading latest invoice for ${mark}...`,
      type: 'info'
    })
  }

  return (
    <div className="w-full">
      <Joyride
        steps={tourSteps}
        run={startTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        callback={handleTourCallback}
        styles={{
          options: {
            primaryColor: 'var(--eai-primary)',
            textColor: '#1C1C1E',
            zIndex: 10000,
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
          },
          tooltipContainer: {
            textAlign: 'left',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
          buttonNext: {
            borderRadius: '0px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonBack: {
            marginRight: '10px',
            fontWeight: 'bold',
            fontSize: '13px',
          },
          buttonSkip: {
            fontSize: '13px',
            fontWeight: 'bold',
          }
        }}
      />
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-[var(--eai-text)]">Billing & Ledger</h1>
        <p className="text-body text-[var(--eai-text-secondary)] font-medium">Professional invoicing and financial fee management.</p>
      </header>

      {/* Apple Wallet Style Cards */}
      <div className="grid gap-6 md:grid-cols-3 mt-8" id="billing-stats-grid">
        <div className="apple-card p-6 bg-gradient-to-br from-[var(--eai-primary)] to-[#004B7C] text-white border-none shadow-xl shadow-[var(--eai-primary)]/20 overflow-hidden relative group" id="stat-revenue">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Receipt size={120} weight="duotone" />
          </div>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <CurrencyDollar size={24} weight="bold" />
            </div>
            <CreditCard size={24} weight="fill" className="opacity-50" />
          </div>
          <div className="text-label text-white/70 relative z-10">Total Revenue</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.totalRevenue)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10 uppercase">
            <ChartLineUp size={16} weight="bold" />
            <span>Reflecting all generated invoices</span>
          </div>
        </div>

        <div className="apple-card p-6 bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-xl shadow-red-500/20 overflow-hidden relative group" id="stat-outstanding">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <WarningCircle size={24} weight="bold" />
            </div>
          </div>
          <div className="text-label text-white/70 relative z-10">Outstanding</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.outstanding)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10 uppercase">
            <Clock size={16} weight="bold" />
            <span>{stats.overdueCount} Overdue Invoices</span>
          </div>
        </div>

        <div className="apple-card p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-xl shadow-emerald-500/20 overflow-hidden relative group" id="stat-paid">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm">
              <ArrowUpRight size={24} weight="bold" />
            </div>
            <ChartLineUp size={24} weight="fill" className="opacity-50" />
          </div>
          <div className="text-label text-white/70 relative z-10">Paid (MTD)</div>
          <div className="text-h1 text-white leading-none mt-1 relative z-10">{formatAmount(stats.paidMtd)}</div>
          <div className="mt-6 flex items-center gap-1.5 text-micro font-black relative z-10 uppercase">
            <span className="bg-white/20 px-2 py-0.5 rounded-full">Active</span>
            <span>Across {stats.clientCount} Clients</span>
          </div>
        </div>
      </div>

      {/* Transaction Ledger */}
      <div className="apple-card overflow-hidden mt-8" id="billing-ledger">
        <div className="border-b border-[var(--eai-border)] bg-[var(--eai-bg)]/30 px-6 py-4 flex items-center justify-between">
          <h2 className="text-h3">Transaction History</h2>
          <button
            onClick={() => addToast({ title: 'Funnel clicked', type: 'info' })}
            className="flex items-center gap-2 text-label hover:text-[var(--eai-text)] transition-colors"
          >
            <Funnel size={16} weight="bold" />
            Funnel
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="w-full animate-pulse p-6">
              {/* Table Header Skeleton */}
              <div className="flex gap-4 pb-4 border-b border-[var(--eai-border)]">
                <div className="h-4 w-32 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-20 bg-[var(--eai-border)]/50 rounded" />
                <div className="h-4 w-24 bg-[var(--eai-border)]/50 rounded ml-auto" />
              </div>
              {/* Table Rows Skeleton */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 py-5 border-b border-[var(--eai-border)]">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-[var(--eai-border)]/40 rounded" />
                    <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                  <div className="h-6 w-16 bg-[var(--eai-border)]/40 rounded" />
                  <div className="h-4 w-24 bg-[var(--eai-border)]/30 rounded" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="h-16 w-16 bg-[var(--eai-bg)] flex items-center justify-center rounded-2xl">
                <Receipt size={32} className="text-[var(--eai-text-secondary)] opacity-50" />
              </div>
              <div>
                <h3 className="text-h3 text-[var(--eai-text)]">No transactions found</h3>
                <p className="text-body text-[var(--eai-text-secondary)]">Your ledger will appear here once invoices are generated.</p>
              </div>
              <button 
                onClick={() => navigate('/intake')}
                className="apple-button-secondary text-label"
              >
                Create First Invoice
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--eai-bg)]/20 border-b border-[var(--eai-border)]">
                <tr>
                  <th className="px-6 py-4 text-label">Mark / Client</th>
                  <th className="px-6 py-4 text-label">Type</th>
                  <th className="px-6 py-4 text-label">Date</th>
                  <th className="px-6 py-4 text-label">Amount</th>
                  <th className="px-6 py-4 text-label">Status</th>
                  <th className="px-6 py-4 text-label text-right">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--eai-border)]">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="group hover:bg-[var(--eai-bg)]/40 transition-colors cursor-pointer"
                    onClick={() => tx.markId && navigate(`/trademarks/${tx.markId}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="text-body font-bold text-[var(--eai-text)]">{tx.markName}</div>
                      <div className="text-micro text-[var(--eai-text-secondary)]">Client</div>
                      <div className="text-micro text-[var(--eai-text-secondary)]">{(tx as { clientName?: string }).clientName || 'Global Legal Ltd.'}</div>
                    </td>
                    <td className="px-6 py-5 text-body font-medium">{tx.type}</td>
                    <td className="px-6 py-5 text-body text-[var(--eai-text-secondary)] font-medium">{tx.date}</td>
                    <td className="px-6 py-5 text-body font-bold">{formatAmount(tx.amount)}</td>
                    <td className="px-6 py-5">
                      <span className={[
                        "inline-flex h-6 items-center px-2.5 rounded-none text-micro font-black border",
                        "inline-flex h-6 items-center px-2.5 rounded-none text-micro font-black uppercase border",
                        tx.status === 'PAID' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : 
                        tx.status === 'OVERDUE' ? "bg-red-500/10 text-red-600 border-red-500/20" :
                        "bg-orange-500/10 text-orange-600 border-orange-500/20"
                      ].join(' ')}>{tx.status}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-body font-medium text-[var(--eai-text-secondary)]">{tx.method}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(tx.markName);
                          }}
                          className="p-2 rounded-xl hover:bg-white transition-colors opacity-0 group-hover:opacity-100 text-[var(--eai-primary)] shadow-sm"
                        >
                          <Download size={18} weight="bold" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
