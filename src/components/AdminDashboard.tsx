import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Briefcase, CreditCard, TrendingUp, FileText, Calendar, Search, FileCheck, FileEdit, Receipt, Shield } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell
} from 'recharts';

type TimeRange = 'all' | 'month' | 'quarter' | 'ytd';

export const AdminDashboard: React.FC = () => {
  const { permissions } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<{
    sows: any[],
    proposals: any[],
    invoices: any[],
    projects: any[]
  }>({ sows: [], proposals: [], invoices: [], projects: [] });

  const [stats, setStats] = useState({
    totalClients: 0,
    activeProjects: 0,
    totalRevenue: 0,
    pendingInvoices: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any[]>([]);

  const isWithinRange = (dateStr: string) => {
    if (timeRange === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    
    if (timeRange === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    
    if (timeRange === 'quarter') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);
      return date >= ninetyDaysAgo;
    }
    
    if (timeRange === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    
    return true;
  };

  useEffect(() => {
    if (!permissions.viewAnalytics) return;

    const clientsUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStats(prev => ({ ...prev, totalClients: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const projectsUnsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'project' }));
      setAllDocs(prev => ({ ...prev, projects: docs }));

      const filteredProjects = snapshot.docs.filter(doc => isWithinRange(doc.data().createdAt));
      const activeCount = filteredProjects.filter(doc => doc.data().status === 'active').length;
      
      const statusDistribution: { [key: string]: number } = {};
      filteredProjects.forEach(doc => {
        const status = doc.data().status;
        statusDistribution[status] = (statusDistribution[status] || 0) + 1;
      });

      setStats(prev => ({ ...prev, activeProjects: activeCount }));
      setProjectData(Object.entries(statusDistribution).map(([name, value]) => ({ name, value })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'projects'));

    const invoicesUnsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'invoice' }));
      setAllDocs(prev => ({ ...prev, invoices: docs }));

      let revenue = 0;
      let pending = 0;
      const monthlyRevenue: { [key: string]: number } = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!isWithinRange(data.createdAt)) return;

        if (data.status === 'paid') {
          revenue += data.amount;
          const date = new Date(data.createdAt);
          const month = date.toLocaleString('default', { month: 'short' });
          const year = date.getFullYear();
          const key = timeRange === 'all' ? `${month} ${year}` : month;
          monthlyRevenue[key] = (monthlyRevenue[key] || 0) + data.amount / 100;
        } else {
          pending++;
        }
      });

      setStats(prev => ({ ...prev, totalRevenue: revenue / 100, pendingInvoices: pending }));
      
      // Sort revenue data by date
      const sortedRevenue = Object.entries(monthlyRevenue)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return months.indexOf(a.name.split(' ')[0]) - months.indexOf(b.name.split(' ')[0]);
        });

      setRevenueData(sortedRevenue);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'invoices'));

    const sowsUnsubscribe = onSnapshot(collection(db, 'sows'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'sow' }));
      setAllDocs(prev => ({ ...prev, sows: docs }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sows'));

    const proposalsUnsubscribe = onSnapshot(collection(db, 'proposals'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'proposal' }));
      setAllDocs(prev => ({ ...prev, proposals: docs }));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'proposals'));

    return () => {
      clientsUnsubscribe();
      projectsUnsubscribe();
      invoicesUnsubscribe();
      sowsUnsubscribe();
      proposalsUnsubscribe();
    };
  }, [timeRange]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    
    const results = [
      ...allDocs.sows,
      ...allDocs.proposals,
      ...allDocs.invoices,
      ...allDocs.projects
    ].filter(doc => {
      const title = (doc.title || doc.name || doc.id || '').toLowerCase();
      const clientUid = (doc.clientUid || '').toLowerCase();
      const status = (doc.status || '').toLowerCase();
      return title.includes(query) || clientUid.includes(query) || status.includes(query);
    }).slice(0, 8); // Limit results

    setSearchResults(results);
  }, [searchQuery, allDocs]);

  const rangeLabels = {
    all: 'All Time',
    month: 'Last 30 Days',
    quarter: 'Last 90 Days',
    ytd: 'Year to Date'
  };

  return (
    <div className="space-y-8">
      {/* Global Search Bar */}
      <div className="relative z-50">
        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gold/40 group-focus-within:text-gold transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search across SOWs, Proposals, Invoices, and Projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gold/5 border border-gold/10 rounded-2xl md:rounded-3xl pl-16 pr-6 py-4 md:py-6 text-oat font-light text-base md:text-xl focus:outline-none focus:border-gold/30 focus:bg-gold/10 transition-all backdrop-blur-xl shadow-2xl shadow-gold/5"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-oat/20 hover:text-gold transition-colors text-[10px] font-mono uppercase tracking-widest"
            >
              Clear
            </button>
          )}
        </div>

        <AnimatePresence>
          {isSearching && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 right-0 mt-4 bg-vanta border border-gold/20 rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-2xl z-50"
            >
              <div className="p-4 border-b border-gold/10 bg-gold/5">
                <p className="text-[10px] font-mono text-gold/40 uppercase tracking-[0.3em]">Search Results ({searchResults.length})</p>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <div 
                      key={result.id}
                      className="p-4 md:p-6 border-b border-gold/5 hover:bg-gold/5 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                          {result.type === 'sow' && <FileCheck size={18} />}
                          {result.type === 'proposal' && <FileEdit size={18} />}
                          {result.type === 'invoice' && <Receipt size={18} />}
                          {result.type === 'project' && <Briefcase size={18} />}
                        </div>
                        <div>
                          <h4 className="text-oat font-bold text-sm md:text-base group-hover:text-gold transition-colors">
                            {result.title || result.name || `Document #${result.id.slice(0, 8)}`}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[8px] md:text-[10px] font-mono text-gold/40 uppercase tracking-widest">{result.type}</span>
                            <span className="w-1 h-1 rounded-full bg-gold/20" />
                            <span className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">{result.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] md:text-[10px] font-mono text-oat/20 uppercase tracking-widest">
                          {new Date(result.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-oat/40 font-mono text-xs uppercase tracking-widest">No matching documents found</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {permissions.viewAnalytics ? (
        <>
          {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em] mb-2">System Analytics</h2>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat">Performance Overview</h3>
        </div>
        <div className="flex items-center gap-2 p-1 bg-gold/5 border border-gold/10 rounded-full">
          {(['all', 'month', 'quarter', 'ytd'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest transition-all ${
                timeRange === range 
                  ? 'bg-gold text-vanta font-bold' 
                  : 'text-oat/40 hover:text-gold'
              }`}
            >
              {range === 'all' ? 'All' : range === 'month' ? '30D' : range === 'quarter' ? '90D' : 'YTD'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'text-gold' },
          { label: 'Active Projects', value: stats.activeProjects, icon: Briefcase, color: 'text-blue-400' },
          { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400' },
          { label: 'Pending Invoices', value: stats.pendingInvoices, icon: CreditCard, color: 'text-red-400' }
        ].map((kpi, i) => (
          <div key={i} className="p-4 md:p-6 border border-gold/10 bg-gold/5 rounded-2xl md:rounded-3xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <kpi.icon className={`${kpi.color} md:w-5 md:h-5`} size={16} />
              <span className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest">Real-time</span>
            </div>
            <p className="text-xl md:text-3xl font-black text-oat">{kpi.value}</p>
            <p className="text-[8px] md:text-[10px] font-mono text-oat/40 uppercase tracking-widest mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="p-6 md:p-8 border border-gold/10 bg-vanta/50 rounded-[24px] md:rounded-[32px] backdrop-blur-xl h-[300px] md:h-[400px]">
          <h3 className="text-lg md:text-xl font-bold text-oat mb-6 md:mb-8">Revenue Growth</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#F7F7F540" fontSize={10} />
              <YAxis stroke="#F7F7F540" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#030407', border: '1px solid #E5C07B20', borderRadius: '12px' }}
                itemStyle={{ color: '#E5C07B' }}
              />
              <Line type="monotone" dataKey="value" stroke="#E5C07B" strokeWidth={2} dot={{ fill: '#E5C07B' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-8 border border-gold/10 bg-vanta/50 rounded-[32px] backdrop-blur-xl h-[400px]">
          <h3 className="text-xl font-bold text-oat mb-8">Project Distribution</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" stroke="#F7F7F540" fontSize={10} />
              <YAxis stroke="#F7F7F540" fontSize={10} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#030407', border: '1px solid #E5C07B20', borderRadius: '12px' }}
                itemStyle={{ color: '#E5C07B' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {projectData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'active' ? '#E5C07B' : '#E5C07B40'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
    ) : (
        <div className="p-12 border border-gold/10 bg-gold/5 rounded-[32px] text-center">
          <Shield className="mx-auto text-gold/20 mb-4" size={48} />
          <h3 className="text-xl font-bold text-oat mb-2 uppercase tracking-tighter">Analytics Restricted</h3>
          <p className="text-oat/40 text-sm max-w-md mx-auto">You do not have permission to view system analytics. Please contact a super administrator for access.</p>
        </div>
      )}
    </div>
  );
};
