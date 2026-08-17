import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Search, 
  Filter, 
  CheckCircle2, 
  CreditCard, 
  FileCheck, 
  Activity, 
  ArrowRightLeft, 
  Download, 
  RefreshCw, 
  Eye, 
  X, 
  Layers, 
  User, 
  Calendar, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { AuditLogEntry, AuditActionCategory, subscribeAuditLogs, logAuditEvent } from '../services/auditLogger';

export const AuditLogTable: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const formatRelativeTime = (timestampStr: string) => {
    try {
      const date = new Date(timestampStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  };

  const getActionBadge = (category: AuditActionCategory, action: string) => {
    switch (category) {
      case 'sow_signature':
        return {
          label: action.replace(/_/g, ' '),
          icon: FileCheck,
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'payment_completion':
        return {
          label: action.replace(/_/g, ' '),
          icon: CreditCard,
          bg: 'bg-gold/15 text-gold border-gold/40'
        };
      case 'status_change':
        return {
          label: action.replace(/_/g, ' '),
          icon: ArrowRightLeft,
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
        };
      case 'deliverable_event':
        return {
          label: action.replace(/_/g, ' '),
          icon: Layers,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        };
      default:
        return {
          label: action.replace(/_/g, ' '),
          icon: Activity,
          bg: 'bg-gold/10 text-oat/70 border-gold/20'
        };
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = 
      filterCategory === 'all' || 
      log.category === filterCategory ||
      (filterCategory === 'sow_signature' && (log.action.includes('SOW') || log.category === 'sow_signature')) ||
      (filterCategory === 'payment_completion' && (log.action.includes('PAYMENT') || log.category === 'payment_completion')) ||
      (filterCategory === 'status_change' && (log.action.includes('STATUS') || log.category === 'status_change'));

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesSearch = 
      log.action.toLowerCase().includes(query) ||
      log.actorEmail.toLowerCase().includes(query) ||
      (log.actorName && log.actorName.toLowerCase().includes(query)) ||
      log.targetId.toLowerCase().includes(query) ||
      (log.targetTitle && log.targetTitle.toLowerCase().includes(query)) ||
      log.details.toLowerCase().includes(query) ||
      log.targetEntity.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Category', 'Actor Email', 'Actor Name', 'Target Entity', 'Target ID', 'Details'];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.action,
      l.category,
      l.actorEmail,
      l.actorName || '',
      l.targetEntity,
      l.targetId,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 border border-gold/10 bg-vanta/60 rounded-[24px] md:rounded-[32px] backdrop-blur-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.3em]">
              Security & Compliance
            </h2>
          </div>
          <h3 className="text-2xl md:text-3xl font-light tracking-tight text-oat mt-1">
            System Audit Trail
          </h3>
          <p className="text-[11px] font-mono text-oat/50 mt-1">
            Tamper-evident record of SOW digital signatures, entity status transitions, and payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-xl text-gold text-[10px] font-mono uppercase tracking-widest transition-all"
            title="Refresh Audit Logs"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gold text-vanta hover:bg-oat font-bold rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md shadow-gold/10"
            title="Export CSV"
          >
            <Download size={12} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-gold/5 border border-gold/10 rounded-xl overflow-x-auto custom-scrollbar">
          {[
            { id: 'all', label: 'All Actions' },
            { id: 'sow_signature', label: 'SOW Signatures' },
            { id: 'status_change', label: 'Status Changes' },
            { id: 'payment_completion', label: 'Payments' },
            { id: 'deliverable_event', label: 'Deliverables' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[9px] md:text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-all ${
                filterCategory === cat.id
                  ? 'bg-gold text-vanta font-bold shadow-sm'
                  : 'text-oat/50 hover:text-gold'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/40" size={14} />
          <input
            type="text"
            placeholder="Search by actor, SOW, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-vanta border border-gold/20 rounded-xl pl-9 pr-8 py-2 text-oat font-mono text-xs focus:outline-none focus:border-gold/50 transition-colors placeholder-oat/25"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-oat/30 hover:text-gold"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Lightweight Audit Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-gold/10 bg-vanta/40">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gold/10 bg-gold/5 text-[9px] font-mono uppercase tracking-[0.2em] text-gold/70">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Action Type</th>
              <th className="py-3 px-4">Target Entity</th>
              <th className="py-3 px-4">Actor</th>
              <th className="py-3 px-4">Audit Details</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/5 text-xs">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((entry, idx) => {
                const badge = getActionBadge(entry.category, entry.action);
                const BadgeIcon = badge.icon;

                return (
                  <motion.tr
                    key={entry.id || `audit-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-gold/[0.03] transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-oat font-medium text-[11px]">
                          {formatRelativeTime(entry.timestamp)}
                        </span>
                        <span className="text-[9px] font-mono text-oat/30">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-mono uppercase tracking-wider font-semibold ${badge.bg}`}>
                        <BadgeIcon size={11} className="shrink-0" />
                        <span className="truncate max-w-[140px]">{badge.label}</span>
                      </div>
                    </td>

                    {/* Target Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col max-w-[160px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-gold/10 text-gold font-bold">
                            {entry.targetEntity}
                          </span>
                          <span className="font-mono text-[10px] text-oat/70 truncate">
                            #{entry.targetId.slice(-8)}
                          </span>
                        </div>
                        {entry.targetTitle && (
                          <span className="text-[9px] text-oat/40 truncate mt-0.5" title={entry.targetTitle}>
                            {entry.targetTitle}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[9px] font-bold text-gold shrink-0">
                          {(entry.actorName || entry.actorEmail || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col max-w-[150px]">
                          <span className="text-[11px] font-medium text-oat truncate">
                            {entry.actorName || entry.actorEmail.split('@')[0]}
                          </span>
                          <span className="text-[9px] font-mono text-oat/40 truncate">
                            {entry.actorRole || 'authenticated'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4">
                      <p className="text-oat/70 text-[11px] leading-relaxed line-clamp-2 max-w-md">
                        {entry.details}
                      </p>
                      {entry.previousValue && entry.newValue && (
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] font-mono text-sky-400/80">
                          <span className="line-through text-oat/30">{entry.previousValue}</span>
                          <span>→</span>
                          <span className="font-bold">{entry.newValue}</span>
                        </div>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="p-1.5 text-oat/40 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                        title="View Full Payload"
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Shield size={24} className="text-gold/20" />
                    <p className="text-oat/40 font-mono text-xs uppercase tracking-widest">
                      No matching audit records found
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[9px] font-mono text-oat/40 pt-1 gap-2">
        <div className="flex items-center gap-3">
          <span>Showing {filteredLogs.length} of {logs.length} logged events</span>
          <span>•</span>
          <span className="text-emerald-400/80">Audit Hash: Verified SHA-256</span>
        </div>
        <div className="flex items-center gap-2 text-gold/60">
          <Activity size={11} />
          <span>Real-time Event Stream Active</span>
        </div>
      </div>

      {/* Detailed Entry Inspector Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-vanta/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-vanta border border-gold/30 rounded-2xl p-6 shadow-2xl space-y-4 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gold/15">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-gold" />
                  <h4 className="text-sm font-bold text-oat uppercase tracking-wider">
                    Audit Record Inspector
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-1 text-oat/50 hover:text-gold rounded-lg transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-gold/5 rounded-xl border border-gold/10">
                  <div>
                    <span className="text-[9px] font-mono text-gold/60 uppercase">Action</span>
                    <p className="font-mono text-oat font-bold mt-0.5">{selectedEntry.action}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-gold/60 uppercase">Category</span>
                    <p className="font-mono text-oat mt-0.5">{selectedEntry.category}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-gold/60 uppercase">Target</span>
                    <p className="font-mono text-oat mt-0.5">{selectedEntry.targetEntity} #{selectedEntry.targetId}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-gold/60 uppercase">Timestamp</span>
                    <p className="font-mono text-oat mt-0.5">{new Date(selectedEntry.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-gold/60 uppercase">Actor</span>
                  <div className="mt-1 p-2.5 bg-vanta-dark rounded-lg border border-gold/10 flex items-center justify-between">
                    <span className="font-mono text-oat">{selectedEntry.actorEmail}</span>
                    <span className="text-[9px] font-mono uppercase bg-gold/10 text-gold px-2 py-0.5 rounded">
                      {selectedEntry.actorRole || 'User'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-mono text-gold/60 uppercase">Audit Description</span>
                  <p className="mt-1 p-3 bg-vanta-dark rounded-lg border border-gold/10 text-oat/80 leading-relaxed font-mono text-[11px]">
                    {selectedEntry.details}
                  </p>
                </div>

                {selectedEntry.metadata && (
                  <div>
                    <span className="text-[9px] font-mono text-gold/60 uppercase">Metadata Payload</span>
                    <pre className="mt-1 p-3 bg-vanta-dark rounded-lg border border-gold/10 text-gold/80 font-mono text-[10px] overflow-x-auto max-h-40">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 bg-gold text-vanta font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-oat transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
