import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Circle, ArrowRight, ShieldCheck, Sparkles, Layers } from 'lucide-react';

export interface MilestoneItem {
  id: string;
  title: string;
  targetTimeframe?: string;
  status: 'completed' | 'in_progress' | 'pending';
  deliverablesRequired: number;
  deliverablesDelivered: number;
  weightPercentage: number;
}

interface MilestoneProgressBarProps {
  projectId: string;
  sowTitle?: string;
  sowTimeline?: string;
  sowContent?: string;
  deliverablesCount: number;
  customMilestones?: MilestoneItem[];
  onMilestoneClick?: (milestone: MilestoneItem) => void;
  compact?: boolean;
}

export const MilestoneProgressBar: React.FC<MilestoneProgressBarProps> = ({
  projectId,
  sowTitle,
  sowTimeline,
  sowContent,
  deliverablesCount,
  customMilestones,
  onMilestoneClick,
  compact = false
}) => {
  // Derive default milestones from SOW context or custom array
  const milestones: MilestoneItem[] = React.useMemo(() => {
    if (customMilestones && customMilestones.length > 0) {
      return customMilestones;
    }

    // Heuristically map milestones based on standard architecture delivery lifecycle and deliverables count
    const totalDeliverables = deliverablesCount;
    
    return [
      {
        id: 'm1',
        title: 'Phase 1: Architecture Blueprint & Intake',
        targetTimeframe: 'Discovery (Sprint 1)',
        status: totalDeliverables >= 1 ? 'completed' : 'in_progress',
        deliverablesRequired: 1,
        deliverablesDelivered: Math.min(1, totalDeliverables),
        weightPercentage: 25
      },
      {
        id: 'm2',
        title: 'Phase 2: Core Engineering & Integrations',
        targetTimeframe: 'Build (Sprint 2-3)',
        status: totalDeliverables >= 2 ? (totalDeliverables >= 3 ? 'completed' : 'in_progress') : (totalDeliverables === 1 ? 'in_progress' : 'pending'),
        deliverablesRequired: 2,
        deliverablesDelivered: Math.max(0, Math.min(2, totalDeliverables - 1)),
        weightPercentage: 35
      },
      {
        id: 'm3',
        title: 'Phase 3: Formal Verification & Proof',
        targetTimeframe: 'Verify (Sprint 4)',
        status: totalDeliverables >= 4 ? 'completed' : (totalDeliverables >= 2 ? 'in_progress' : 'pending'),
        deliverablesRequired: 1,
        deliverablesDelivered: Math.max(0, Math.min(1, totalDeliverables - 3)),
        weightPercentage: 25
      },
      {
        id: 'm4',
        title: 'Phase 4: Client Handover & Acceptance',
        targetTimeframe: 'Sign-off',
        status: totalDeliverables >= 5 ? 'completed' : (totalDeliverables >= 4 ? 'in_progress' : 'pending'),
        deliverablesRequired: 1,
        deliverablesDelivered: Math.max(0, Math.min(1, totalDeliverables - 4)),
        weightPercentage: 15
      }
    ];
  }, [customMilestones, deliverablesCount]);

  // Calculate weighted progress percentage
  const progressPercent = React.useMemo(() => {
    let completedWeight = 0;
    milestones.forEach((m) => {
      if (m.status === 'completed') {
        completedWeight += m.weightPercentage;
      } else if (m.status === 'in_progress') {
        completedWeight += m.weightPercentage * (m.deliverablesDelivered / Math.max(1, m.deliverablesRequired) || 0.5);
      }
    });
    return Math.min(100, Math.max(0, Math.round(completedWeight)));
  }, [milestones]);

  const completedCount = milestones.filter(m => m.status === 'completed').length;

  return (
    <div className="w-full space-y-4 p-4 md:p-5 bg-gold/[0.03] border border-gold/15 rounded-2xl">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
            <Layers size={14} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold text-oat uppercase tracking-wider">
                SOW Milestone Progress
              </h5>
              <span className="px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold font-mono text-[8px] font-bold">
                {completedCount}/{milestones.length} Phases
              </span>
            </div>
            {sowTimeline && (
              <p className="text-[9px] font-mono text-oat/40 truncate max-w-md">
                Scope: {sowTimeline}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="text-right">
            <div className="text-sm font-black font-mono text-gold">{progressPercent}%</div>
            <div className="text-[8px] font-mono text-oat/30 uppercase tracking-widest">Completion</div>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2.5 bg-vanta-dark border border-gold/20 rounded-full overflow-hidden p-0.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-gold/60 via-gold to-amber-300 rounded-full relative shadow-sm shadow-gold/30"
        >
          {progressPercent > 0 && (
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full animate-pulse" />
          )}
        </motion.div>
      </div>

      {/* Milestone Stages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
        {milestones.map((milestone, idx) => {
          const isCompleted = milestone.status === 'completed';
          const isInProgress = milestone.status === 'in_progress';
          
          return (
            <div
              key={milestone.id || idx}
              onClick={() => onMilestoneClick && onMilestoneClick(milestone)}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                isCompleted 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40' 
                  : isInProgress
                  ? 'bg-gold/10 border-gold/40 text-gold shadow-sm shadow-gold/5'
                  : 'bg-vanta/30 border-gold/5 text-oat/40 hover:border-gold/15'
              } ${onMilestoneClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono uppercase font-bold tracking-widest opacity-80">
                  Phase 0{idx + 1}
                </span>
                {isCompleted ? (
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                ) : isInProgress ? (
                  <Clock size={13} className="text-gold animate-pulse shrink-0" />
                ) : (
                  <Circle size={13} className="text-oat/20 shrink-0" />
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold text-oat line-clamp-1">
                  {milestone.title.replace(/^Phase \d+:\s*/, '')}
                </p>
                <div className="flex items-center justify-between text-[8px] font-mono text-oat/40 mt-1">
                  <span>{milestone.targetTimeframe || `Target: Sprint ${idx + 1}`}</span>
                  <span className="font-semibold">{milestone.weightPercentage}% weight</span>
                </div>
              </div>

              {/* Mini Status Badge */}
              <div className="pt-1.5 border-t border-gold/5 flex items-center justify-between text-[8px] font-mono">
                <span className={isCompleted ? 'text-emerald-400 font-bold uppercase' : isInProgress ? 'text-gold font-bold uppercase' : 'text-oat/30 uppercase'}>
                  {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Upcoming'}
                </span>
                <span className="text-oat/30">
                  {isCompleted ? 'Verified' : `${milestone.deliverablesDelivered}/${milestone.deliverablesRequired} artifacts`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
