import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Copy, 
  Check, 
  Clock, 
  Percent, 
  TrendingUp, 
  FileText,
  ArrowRight
} from 'lucide-react';
import { SOWSmartSummaryResult } from '../services/smartSummaryService';

interface SmartSummaryModalProps {
  summary: SOWSmartSummaryResult;
  onClose: () => void;
  onApplyMilestones?: (milestones: any[]) => void;
}

export const SmartSummaryModal: React.FC<SmartSummaryModalProps> = ({ 
  summary, 
  onClose,
  onApplyMilestones 
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'risks' | 'milestones' | 'scope'>('all');

  const copyToClipboard = () => {
    const text = `
=== SMART SOW SUMMARY ===
Title: ${summary.sowTitle}
Summary: ${summary.executiveSummary}

--- KEY MILESTONE DATES ---
${summary.keyMilestoneDates.map(m => `• ${m.milestone} | Date: ${m.targetDate} | Deliverable: ${m.deliverable} (${m.paymentPercentage}%)`).join('\n')}

--- POTENTIAL RISKS & MITIGATION ---
${summary.potentialRisks.map(r => `[${r.severity.toUpperCase()}] ${r.category}: ${r.riskDescription}\n  Mitigation: ${r.mitigationStrategy}`).join('\n')}

--- SCOPE BOUNDARIES ---
In Scope:
${summary.scopeBoundaries.inScope.map(s => `+ ${s}`).join('\n')}
Out of Scope:
${summary.scopeBoundaries.outOfScope.map(s => `- ${s}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-vanta/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-vanta border border-gold/30 rounded-[24px] md:rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gold/15 bg-gold/5 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gold/15 border border-gold/30 rounded-2xl flex items-center justify-center text-gold shadow-md shadow-gold/10">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] md:text-[10px] font-mono text-gold uppercase tracking-[0.25em]">
                  Gemini AI Intelligence
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[8px]">
                  {summary.confidenceScore}% Confidence
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-oat line-clamp-1 mt-0.5">
                Smart SOW Summary & Risk Analysis
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 rounded-xl text-xs font-mono transition-colors"
              title="Copy Summary Text"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-oat/50 hover:text-gold hover:bg-gold/10 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="px-6 md:px-8 pt-4 pb-2 border-b border-gold/10 bg-vanta/50 flex gap-2 overflow-x-auto">
          {[
            { id: 'all', label: 'Full Overview' },
            { id: 'milestones', label: `Key Milestones (${summary.keyMilestoneDates.length})` },
            { id: 'risks', label: `Risk Matrix (${summary.potentialRisks.length})` },
            { id: 'scope', label: 'Scope Boundaries' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gold text-vanta font-bold shadow-sm'
                  : 'text-oat/50 hover:text-gold hover:bg-gold/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {/* Executive Summary Card */}
          {(activeTab === 'all' || activeTab === 'milestones') && (
            <div className="p-4 md:p-5 bg-gold/5 border border-gold/15 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-gold font-mono text-[9px] uppercase tracking-widest">
                <FileText size={13} />
                <span>Executive Briefing</span>
              </div>
              <p className="text-oat/90 text-sm leading-relaxed font-sans">
                {summary.executiveSummary}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4 text-[10px] font-mono text-oat/40">
                <span>Target: <strong className="text-oat/80">{summary.sowTitle}</strong></span>
                <span>•</span>
                <span>Governance: <strong className="text-gold/80">{summary.governanceCompliance.framework}</strong></span>
              </div>
            </div>
          )}

          {/* Key Milestone Dates Section */}
          {(activeTab === 'all' || activeTab === 'milestones') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gold" />
                  <h4 className="text-sm font-bold text-oat uppercase tracking-wider">
                    Key Milestone Dates & Deliverables
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gold/60">
                  {summary.keyMilestoneDates.length} Milestones Mapped
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {summary.keyMilestoneDates.map((m, idx) => (
                  <div 
                    key={idx}
                    className="p-4 bg-vanta-dark border border-gold/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gold/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center font-mono font-bold text-gold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-oat text-sm">{m.milestone}</h5>
                          <span className={`px-2 py-0.5 rounded-full border text-[8px] font-mono uppercase ${getSeverityStyle(m.riskLevel)}`}>
                            {m.riskLevel} risk
                          </span>
                        </div>
                        <p className="text-xs text-oat/70 leading-relaxed font-sans">
                          {m.deliverable}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-gold/5">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/5 rounded-xl border border-gold/10">
                        <Clock size={12} className="text-gold/70" />
                        <span className="text-[11px] font-mono text-gold font-medium">
                          {m.targetDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-vanta rounded-xl border border-gold/10 text-oat/80 font-mono text-xs font-bold">
                        <span>{m.paymentPercentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Potential Risks & Mitigations */}
          {(activeTab === 'all' || activeTab === 'risks') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <h4 className="text-sm font-bold text-oat uppercase tracking-wider">
                    Potential Risks & AI Mitigation Strategies
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-oat/40">
                  Proactive Risk Assessment
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {summary.potentialRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-vanta-dark border border-gold/10 rounded-2xl space-y-2 hover:border-gold/25 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-mono uppercase font-bold tracking-wider ${getSeverityStyle(risk.severity)}`}>
                          {risk.severity} Severity
                        </span>
                        <span className="text-[10px] font-mono text-gold/70 uppercase">
                          [{risk.category.replace('_', ' ')}]
                        </span>
                      </div>
                    </div>

                    <p className="text-oat/90 text-xs font-medium leading-relaxed">
                      {risk.riskDescription}
                    </p>

                    <div className="p-3 bg-gold/5 rounded-xl border border-gold/10 flex items-start gap-2 text-xs">
                      <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                          Mitigation Protocol
                        </span>
                        <p className="text-oat/70 text-[11px] leading-relaxed">
                          {risk.mitigationStrategy}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope Boundaries */}
          {(activeTab === 'all' || activeTab === 'scope') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* In Scope */}
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase tracking-wider font-bold">
                  <CheckCircle2 size={14} />
                  <span>In-Scope Contract Boundaries</span>
                </div>
                <ul className="space-y-2 text-xs text-oat/80">
                  {summary.scopeBoundaries.inScope.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 font-bold mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Out of Scope */}
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-mono text-xs uppercase tracking-wider font-bold">
                  <X size={14} />
                  <span>Out-of-Scope Exclusions</span>
                </div>
                <ul className="space-y-2 text-xs text-oat/80">
                  {summary.scopeBoundaries.outOfScope.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-red-400 font-bold mt-0.5">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-gold/15 bg-gold/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-mono text-oat/40">
            Analyzed {new Date(summary.analyzedAt).toLocaleDateString()} • Powered by Gemini 3.7 Flash
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onApplyMilestones && (
              <button
                onClick={() => {
                  onApplyMilestones(summary.keyMilestoneDates);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gold text-vanta font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-oat transition-all flex items-center justify-center gap-2 shadow-md shadow-gold/10"
              >
                <span>Sync to Timeline</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 border border-gold/20 text-gold rounded-xl text-xs font-mono uppercase tracking-widest hover:bg-gold/10 transition-colors text-center"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
