import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  Sparkles,
  Download,
  ExternalLink
} from 'lucide-react';

interface ClientStatsDashboardProps {
  projects: any[];
  invoices: any[];
  sows: any[];
  onNavigateToInvoices?: () => void;
  onNavigateToTimeline?: () => void;
  onPayInvoice?: (invoice: any) => void;
}

export const ClientStatsDashboard: React.FC<ClientStatsDashboardProps> = ({
  projects,
  invoices,
  sows,
  onNavigateToInvoices,
  onNavigateToTimeline,
  onPayInvoice
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '6m' | '3m'>('all');
  const [chartView, setChartView] = useState<'spend' | 'deliverables' | 'deadlines'>('spend');

  // --- 1. Total Spend Calculations ---
  const totalInvoicedCents = invoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const totalPaidCents = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
  const totalPendingCents = totalInvoicedCents - totalPaidCents;
  
  // Total committed value from signed SOWs
  const totalSowValue = sows
    .filter(s => s.status === 'signed' || s.status === 'active')
    .reduce((acc, s) => acc + (Number(s.cost) || 0), 0);

  const effectiveTotalSpend = totalInvoicedCents > 0 ? (totalPaidCents / 100) : totalSowValue;
  const committedPipeline = totalInvoicedCents > 0 ? (totalInvoicedCents / 100) : totalSowValue;

  // --- 2. Deliverables Metrics ---
  const allDeliverables = projects.flatMap(p => 
    (p.deliverables || []).map((del: any) => ({
      ...del,
      projectTitle: p.title || 'General Milestone',
      projectId: p.id
    }))
  );
  const activeDeliverablesCount = allDeliverables.length;

  // Deliverables breakdown by file type category
  const deliverablesByType: { [key: string]: number } = {};
  allDeliverables.forEach(del => {
    const mime = (del.type || '').toLowerCase();
    const ext = (del.name || '').split('.').pop()?.toLowerCase() || '';
    let category = 'Documents';
    if (mime.includes('pdf') || ext === 'pdf' || mime.includes('doc') || ext === 'docx') category = 'Contracts & Specs';
    else if (mime.startsWith('image/') || ['png', 'jpg', 'svg', 'webp'].includes(ext)) category = 'UI & Visual Assets';
    else if (mime.includes('spreadsheet') || mime.includes('excel') || ['csv', 'xlsx'].includes(ext)) category = 'Datasets & Audits';
    else if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || ['ts', 'js', 'json', 'py'].includes(ext)) category = 'Code & API Builds';
    else if (mime.includes('zip') || mime.includes('tar') || ['zip', 'gz'].includes(ext)) category = 'Release Bundles';
    
    deliverablesByType[category] = (deliverablesByType[category] || 0) + 1;
  });

  const deliverableTypeData = Object.entries(deliverablesByType).map(([name, value]) => ({
    name,
    value
  }));

  // Deliverables by Project
  const deliverablesByProjectData = projects.map(p => ({
    name: p.title ? (p.title.length > 14 ? `${p.title.substring(0, 12)}...` : p.title) : 'Project',
    count: p.deliverables?.length || 0,
    fullTitle: p.title || 'Untitled Project'
  }));

  // --- 3. Upcoming Payment Deadlines ---
  const today = new Date();
  const sortedInvoices = [...invoices].sort((a, b) => {
    return new Date(a.dueDate || a.createdAt).getTime() - new Date(b.dueDate || b.createdAt).getTime();
  });

  const upcomingInvoices = sortedInvoices.filter(inv => inv.status !== 'paid');
  const nextDeadlineInvoice = upcomingInvoices[0] || null;

  // Calculate days remaining for next deadline
  let daysToNextDeadline: number | null = null;
  if (nextDeadlineInvoice?.dueDate) {
    const diffTime = new Date(nextDeadlineInvoice.dueDate).getTime() - today.getTime();
    daysToNextDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // --- Monthly Spend / Invoicing Trend Data for Recharts ---
  // Group invoices by month
  const monthlySpendMap: { [month: string]: { paid: number; pending: number; total: number } } = {};
  
  // Seed recent 4 months if empty to ensure smooth graph rendering
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const curMonthIdx = today.getMonth();
  for (let i = 4; i >= 0; i--) {
    const d = new Date(today.getFullYear(), curMonthIdx - i, 1);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
    monthlySpendMap[label] = { paid: 0, pending: 0, total: 0 };
  }

  invoices.forEach(inv => {
    const date = new Date(inv.paidAt || inv.createdAt || inv.dueDate || Date.now());
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
    const amt = (Number(inv.amount) || 0) / 100;
    
    if (!monthlySpendMap[monthKey]) {
      monthlySpendMap[monthKey] = { paid: 0, pending: 0, total: 0 };
    }
    if (inv.status === 'paid') {
      monthlySpendMap[monthKey].paid += amt;
    } else {
      monthlySpendMap[monthKey].pending += amt;
    }
    monthlySpendMap[monthKey].total += amt;
  });

  // If no invoices exist but SOWs exist, map SOW commitments into chart
  if (invoices.length === 0 && sows.length > 0) {
    sows.forEach(s => {
      const date = new Date(s.signedAt || s.createdAt || Date.now());
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(2)}`;
      const cost = Number(s.cost) || 0;
      if (!monthlySpendMap[monthKey]) {
        monthlySpendMap[monthKey] = { paid: 0, pending: 0, total: 0 };
      }
      monthlySpendMap[monthKey].paid += cost;
      monthlySpendMap[monthKey].total += cost;
    });
  }

  const monthlyTrendData = Object.entries(monthlySpendMap).map(([month, data]) => ({
    month,
    paid: Math.round(data.paid),
    pending: Math.round(data.pending),
    total: Math.round(data.total)
  }));

  // --- Payment Deadlines Distribution Data for Recharts ---
  const deadlinesChartData = invoices.map((inv, idx) => {
    const dueDate = new Date(inv.dueDate || inv.createdAt);
    const isOverdue = inv.status !== 'paid' && dueDate < today;
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      invoiceId: `#${inv.id.slice(0, 6)}`,
      amount: (inv.amount || 0) / 100,
      daysLeft: diffDays,
      status: inv.status,
      isOverdue,
      dateLabel: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });

  // Spend allocation breakdown for Pie chart
  const spendBreakdownData = [
    { name: 'Paid & Settled', value: Math.round(totalPaidCents / 100) || (totalPaidCents === 0 && totalSowValue > 0 ? totalSowValue : 0), color: '#22c55e' },
    { name: 'Pending / Due', value: Math.round(totalPendingCents / 100), color: '#dfb15b' }
  ].filter(d => d.value > 0);

  const PALETTE = ['#dfb15b', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899'];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-vanta/95 border border-gold/20 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <p className="text-gold font-bold mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-oat/90 py-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
                {entry.name}:
              </span>
              <span className="font-bold text-oat">
                {typeof entry.value === 'number' && entry.dataKey?.toLowerCase().includes('spend') || entry.name?.toLowerCase().includes('paid') || entry.name?.toLowerCase().includes('pending') || entry.name?.toLowerCase().includes('total') || entry.dataKey === 'amount'
                  ? `$${entry.value.toLocaleString()}`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 4 Core Summary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Project Spend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-gradient-to-br from-gold/[0.08] via-vanta/80 to-gold/[0.02] border border-gold/20 rounded-2xl relative overflow-hidden group hover:border-gold/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-gold uppercase tracking-widest font-bold">Total Project Spend</span>
            <div className="p-2 bg-gold/10 rounded-xl text-gold group-hover:scale-110 transition-transform">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-oat tracking-tight font-mono">
              ${effectiveTotalSpend.toLocaleString()}
            </h3>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gold/10 text-[11px] font-mono">
              <span className="text-oat/60">Committed Value</span>
              <span className="text-gold font-bold">${committedPipeline.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Active Deliverables Count */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 bg-gradient-to-br from-blue-500/[0.08] via-vanta/80 to-blue-500/[0.02] border border-blue-500/20 rounded-2xl relative overflow-hidden group hover:border-blue-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">Active Deliverables</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-oat tracking-tight font-mono">
              {activeDeliverablesCount}
            </h3>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-500/10 text-[11px] font-mono">
              <span className="text-oat/60">Across Projects</span>
              <span className="text-blue-400 font-bold">{projects.length} Active</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Upcoming Deadlines & Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 bg-gradient-to-br ${
            daysToNextDeadline !== null && daysToNextDeadline < 0
              ? 'from-red-500/[0.08] via-vanta/80 to-red-500/[0.02] border-red-500/30'
              : 'from-amber-500/[0.08] via-vanta/80 to-amber-500/[0.02] border-amber-500/20'
          } border rounded-2xl relative overflow-hidden group transition-all`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
              daysToNextDeadline !== null && daysToNextDeadline < 0 ? 'text-red-400' : 'text-amber-400'
            }`}>
              Upcoming Payment
            </span>
            <div className={`p-2 rounded-xl group-hover:scale-110 transition-transform ${
              daysToNextDeadline !== null && daysToNextDeadline < 0 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            {nextDeadlineInvoice ? (
              <>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl sm:text-3xl font-black text-oat tracking-tight font-mono">
                    ${((nextDeadlineInvoice.amount || 0) / 100).toLocaleString()}
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    daysToNextDeadline !== null && daysToNextDeadline < 0 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : daysToNextDeadline === 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-gold/10 text-gold border border-gold/20'
                  }`}>
                    {daysToNextDeadline !== null && daysToNextDeadline < 0
                      ? `${Math.abs(daysToNextDeadline)}d Overdue`
                      : daysToNextDeadline === 0
                      ? 'Due Today'
                      : `${daysToNextDeadline}d Left`}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gold/10 text-[11px] font-mono">
                  <span className="text-oat/60">Due Date</span>
                  <span className="text-oat font-bold">
                    {nextDeadlineInvoice.dueDate ? new Date(nextDeadlineInvoice.dueDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl sm:text-3xl font-black text-green-400 tracking-tight font-mono flex items-center gap-2">
                  All Clear
                </h3>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-500/10 text-[11px] font-mono text-green-400/80">
                  <span>No pending balance</span>
                  <CheckCircle2 size={13} />
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Metric 4: SOW & Milestone Fulfillment */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 bg-gradient-to-br from-purple-500/[0.08] via-vanta/80 to-purple-500/[0.02] border border-purple-500/20 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold">SOW Execution</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-oat tracking-tight font-mono">
              {sows.length > 0 ? `${Math.round((sows.filter(s => s.status === 'signed').length / sows.length) * 100)}%` : '100%'}
            </h3>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-500/10 text-[11px] font-mono">
              <span className="text-oat/60">Signed Statements</span>
              <span className="text-purple-400 font-bold">
                {sows.filter(s => s.status === 'signed').length} / {sows.length || 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Chart Visualization Section */}
      <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gold/10 pb-5">
          <div>
            <h4 className="text-lg font-bold text-oat flex items-center gap-2">
              <Sparkles size={18} className="text-gold" />
              Client Financial & Milestone Analytics
            </h4>
            <p className="text-xs font-mono text-oat/50 mt-0.5">
              Live Recharts telemetry for project spend trajectory, deliverable velocity, and deadline tracking
            </p>
          </div>

          {/* Visualization Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-vanta/90 border border-gold/15 rounded-xl text-xs font-mono">
            <button
              onClick={() => setChartView('spend')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'spend'
                  ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              Spend Trend
            </button>
            <button
              onClick={() => setChartView('deliverables')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'deliverables'
                  ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              Deliverables
            </button>
            <button
              onClick={() => setChartView('deadlines')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                chartView === 'deadlines'
                  ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              Deadlines
            </button>
          </div>
        </div>

        {/* View 1: Spend Trajectory & Breakdown */}
        {chartView === 'spend' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider">Monthly Spend & Invoicing Volume</span>
                <span className="text-[10px] font-mono text-gold/80 bg-gold/10 px-2 py-0.5 rounded border border-gold/20">USD ($)</span>
              </div>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#dfb15b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#dfb15b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="month" stroke="#666" fontSize={11} fontFamily="monospace" />
                    <YAxis stroke="#666" fontSize={11} fontFamily="monospace" tickFormatter={(val) => `$${val}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} 
                      iconType="circle"
                    />
                    <Area
                      type="monotone"
                      dataKey="paid"
                      name="Paid Amount"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#paidGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      name="Pending Amount"
                      stroke="#dfb15b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#pendingGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spend Allocation Donut */}
            <div className="space-y-2 flex flex-col justify-between p-4 bg-vanta/40 border border-gold/10 rounded-2xl">
              <div>
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider block mb-1">
                  Settlement Ratio
                </span>
                <p className="text-[11px] text-oat/40">Paid vs Unsettled Balance</p>
              </div>

              <div className="h-[180px] w-full flex items-center justify-center">
                {spendBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {spendBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-oat/40 text-xs font-mono">
                    No payment data recorded
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono pt-2 border-t border-gold/10">
                <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <span className="text-[9px] text-green-400/70 block uppercase">Settled</span>
                  <span className="font-bold text-green-400">
                    ${(totalPaidCents / 100).toLocaleString()}
                  </span>
                </div>
                <div className="p-2 bg-gold/10 border border-gold/20 rounded-xl">
                  <span className="text-[9px] text-gold/70 block uppercase">Outstanding</span>
                  <span className="font-bold text-gold">
                    ${(totalPendingCents / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View 2: Active Deliverables & Artifact Breakdown */}
        {chartView === 'deliverables' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider">Deliverables by Project</span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  {activeDeliverablesCount} Artifacts
                </span>
              </div>
              <div className="h-[260px] w-full">
                {deliverablesByProjectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deliverablesByProjectData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="name" stroke="#666" fontSize={11} fontFamily="monospace" />
                      <YAxis stroke="#666" fontSize={11} fontFamily="monospace" allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Deliverables" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                        {deliverablesByProjectData.map((_, index) => (
                          <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-oat/40 text-xs font-mono">
                    No project deliverables currently uploaded
                  </div>
                )}
              </div>
            </div>

            {/* Deliverable Type Breakdown */}
            <div className="space-y-3 p-4 bg-vanta/40 border border-gold/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider block mb-1">
                  Artifact Distribution
                </span>
                <p className="text-[11px] text-oat/40">Categorized by file class</p>
              </div>

              <div className="space-y-2.5 my-auto">
                {deliverableTypeData.length > 0 ? (
                  deliverableTypeData.map((item, idx) => {
                    const pct = Math.round((item.value / activeDeliverablesCount) * 100) || 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-oat/80 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                            {item.name}
                          </span>
                          <span className="font-bold text-oat">{item.value} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-vanta rounded-full overflow-hidden border border-gold/10">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-mono text-oat/40 text-center py-6">No deliverables to categorize</p>
                )}
              </div>

              {onNavigateToTimeline && (
                <button
                  onClick={onNavigateToTimeline}
                  className="w-full py-2 border border-gold/20 text-gold hover:bg-gold/10 text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar size={12} />
                  <span>Open Interactive Timeline</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* View 3: Payment Deadlines & Invoice Schedule */}
        {chartView === 'deadlines' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider">Invoice Amounts & Payment Status</span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {invoices.length} Invoices
                </span>
              </div>
              <div className="h-[260px] w-full">
                {deadlinesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deadlinesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="invoiceId" stroke="#666" fontSize={11} fontFamily="monospace" />
                      <YAxis stroke="#666" fontSize={11} fontFamily="monospace" tickFormatter={(v) => `$${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" name="Invoice Amount ($)" radius={[6, 6, 0, 0]}>
                        {deadlinesChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.status === 'paid' ? '#22c55e' : entry.isOverdue ? '#ef4444' : '#dfb15b'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-oat/40 text-xs font-mono">
                    No invoices recorded on schedule
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines Checklist */}
            <div className="space-y-3 p-4 bg-vanta/40 border border-gold/10 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-oat/60 tracking-wider block mb-1">
                  Upcoming Payment Schedule
                </span>
                <p className="text-[11px] text-oat/40">Actionable settlement deadlines</p>
              </div>

              <div className="space-y-2.5 my-auto max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                {upcomingInvoices.length > 0 ? (
                  upcomingInvoices.slice(0, 3).map((inv, idx) => {
                    const dueDate = new Date(inv.dueDate || inv.createdAt);
                    const isOverdue = dueDate < today;
                    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div
                        key={inv.id || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
                          isOverdue
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : 'bg-gold/5 border-gold/15 text-oat'
                        }`}
                      >
                        <div>
                          <span className="text-[9px] text-oat/50 uppercase block">Invoice #{inv.id.slice(0, 6)}</span>
                          <span className="font-bold text-sm text-oat">${((inv.amount || 0) / 100).toLocaleString()}</span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            isOverdue ? 'bg-red-500/20 text-red-400' : 'bg-gold/10 text-gold'
                          }`}>
                            {isOverdue ? `${Math.abs(diffDays)}d Overdue` : `${diffDays}d Left`}
                          </span>
                          {onPayInvoice && (
                            <button
                              onClick={() => onPayInvoice(inv)}
                              className="text-[9px] text-gold hover:text-oat underline cursor-pointer"
                            >
                              Pay Now →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center text-green-400 text-xs font-mono flex flex-col items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>All invoices settled!</span>
                  </div>
                )}
              </div>

              {onNavigateToInvoices && (
                <button
                  onClick={onNavigateToInvoices}
                  className="w-full py-2 border border-gold/20 text-gold hover:bg-gold/10 text-[10px] font-mono uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign size={12} />
                  <span>View All Invoices</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
