import React from "react"
import { motion } from "framer-motion"
import { Typography } from "@/components/ui/typography"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  LayoutDashboard, 
  Archive, 
  FileText, 
  RefreshCw, 
  Users, 
  Clock, 
  CreditCard, 
  Trash2,
  CheckCircle,
  Briefcase,
  Menu
} from "lucide-react"

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Archive, label: "Trademarks", active: false },
  { icon: FileText, label: "Application Form", active: false },
  { icon: RefreshCw, label: "Renewal Form", active: false },
  { icon: Users, label: "Clients", active: false },
  { icon: Clock, label: "Deadlines", active: false },
  { icon: CreditCard, label: "Billing", active: false },
  { icon: Trash2, label: "Trash", active: false },
]

const statsCards = [
  { icon: Archive, value: "247", label: "Total Cases", desc: "All trademark files", color: "text-blue-600", bgColor: "bg-blue-50" },
  { icon: CheckCircle, value: "189", label: "Active Trademarks", desc: "Currently in-force", color: "text-green-600", bgColor: "bg-green-50" },
  { icon: Clock, value: "12", label: "Pending Deadlines", desc: "Requires action", color: "text-orange-600", bgColor: "bg-orange-50" },
]

const recentActivity = [
  { icon: Archive, title: "TM-1001 Updated", desc: "STATUS_CHANGE • 2 hours ago" },
  { icon: Briefcase, title: "New Application Filed", desc: "CREATED • 5 hours ago" },
  { icon: Clock, title: "Renewal Notice Sent", desc: "NOTIFICATION_SENT • 1 day ago" },
  { icon: FileText, title: "Documents Uploaded", desc: "DOCUMENT_ADDED • 2 days ago" },
]

export default function PageDesignPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="flex flex-col lg:flex-row gap-12 w-full">
        {/* Left Side - Login Form with Step Indicators */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-md flex-shrink-0">
          {/* Step Indicators - each number with text directly below */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-12">
              <div className="flex flex-col items-center">
                <StepCircle num="01" delay={0.3} />
                <div className="text-center mt-2">
                  <div className="text-xs font-bold text-slate-800">Login</div>
                  <div className="text-[10px] text-slate-500">Enter credentials</div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <StepCircle num="02" delay={0.4} />
                <div className="text-center mt-2">
                  <div className="text-xs font-bold text-slate-800">2FA Verify</div>
                  <div className="text-[10px] text-slate-500">Google Auth</div>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <StepCircle num="03" delay={0.7} />
                <div className="text-center mt-2">
                  <div className="text-xs font-bold text-slate-800">Dashboard</div>
                  <div className="text-[10px] text-slate-500">Manage TM</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
          >
            <Card className="w-full my-4 rounded-xl shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <motion.div 
                className="flex justify-center pt-6 pb-2"
                variants={itemVariants}
              >
                <img 
                  src="/eaip-logo.png" 
                  alt="EAIP Logo" 
                  className="h-16 w-auto object-contain"
                />
              </motion.div>
              <CardHeader className="space-y-1 text-center">
                <motion.div variants={itemVariants}>
                  <Typography.h1a>Welcome back</Typography.h1a>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <Typography.lead>Enter your credentials to access your account</Typography.lead>
                </motion.div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input placeholder="you@company.com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" placeholder="Enter your password" className="h-11" />
                </div>
                <Button className="w-full">Sign in</Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Side - Dashboard Preview extending to right edge */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="hidden lg:flex flex-col items-start justify-start flex-1 pt-8"
        >
          <DashboardPreview />
        </motion.div>
      </div>
    </div>
  )
}

function DashboardPreview() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  
  return (
    <div className="flex w-full h-full min-h-[600px] bg-slate-50">
      {/* Full-height sticky sidebar */}
      <motion.div 
        animate={{ width: sidebarOpen ? 176 : 48 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-gradient-to-b from-[#1e4b6d] to-[#12334d] p-3 flex flex-col overflow-hidden sticky top-0 h-full"
      >
        {/* Hamburger & Logo */}
        <div className="flex items-center gap-2 mb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <Menu className="w-4 h-4 text-white" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: sidebarOpen ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            className="h-8 bg-white/10 rounded-lg flex items-center justify-center flex-1 overflow-hidden"
          >
            <span className="text-white text-xs font-bold whitespace-nowrap">EAIP</span>
          </motion.div>
        </div>
        
        {/* Menu items */}
        <div className="flex flex-col gap-0.5">
          {sidebarItems.map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-white text-xs cursor-pointer whitespace-nowrap ${item.active ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0 text-white" />
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ 
                  opacity: sidebarOpen ? 1 : 0,
                  width: sidebarOpen ? 'auto' : 0
                }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main content - extends to right edge */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex-1 h-full overflow-y-auto p-6"
      >
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <div className="text-2xl font-bold text-[#1e4b6d]">Dashboard Overview</div>
          <div className="text-sm text-slate-500">Live data from East African IP Registry</div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-2 mb-6"
        >
          <div className="bg-[#1e4b6d] text-white text-sm px-4 py-2 rounded-lg">New Application</div>
          <div className="bg-white border text-slate-600 text-sm px-4 py-2 rounded-lg">New Renewal</div>
          <div className="bg-white border text-slate-600 text-sm px-4 py-2 rounded-lg">View Trademarks</div>
        </motion.div>

        {/* Stats Cards - Bento Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          {statsCards.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="bg-white p-4 rounded-xl border border-slate-200 cursor-pointer hover:border-[#1e4b6d]/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-700">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1">{stat.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Calendar Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white p-5 rounded-xl border border-slate-200 mb-6"
        >
          <div className="text-base font-semibold text-slate-700 mb-3">Calendar</div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm mb-3">
            {["S","M","T","W","T","F","S"].map((d,i) => (
              <div key={i} className="text-slate-400 font-medium">{d}</div>
            ))}
            {Array.from({length: 28}, (_, i) => {
              const day = i + 1
              const hasEvent = [3, 7, 12, 15, 21, 25].includes(day)
              return (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  className={`py-2 rounded-lg cursor-pointer text-center ${hasEvent ? 'bg-[#1e4b6d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {day}
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white p-5 rounded-xl border border-slate-200"
        >
          <div className="text-base font-semibold text-slate-700 mb-3">Recent Activity</div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-[#1e4b6d]" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{item.title}</div>
                  <div className="text-xs text-slate-400">{item.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

function StepCircle({ num, delay }: { num: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      className="w-12 h-12 rounded-full bg-[#1e4b6d] text-white flex items-center justify-center font-bold text-lg shadow-lg"
    >
      {num}
    </motion.div>
  )
}
