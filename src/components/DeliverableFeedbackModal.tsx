import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CheckSquare, 
  HelpCircle, 
  Sparkles, 
  User, 
  FileText, 
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { sendNotification } from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';
import { logAuditEvent } from '../services/auditLogger';

export interface DeliverableFeedbackItem {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail: string;
  senderRole: 'client' | 'admin';
  type: 'revision' | 'clarification' | 'approval' | 'general';
  priority: 'normal' | 'high' | 'urgent';
  comment: string;
  createdAt: string;
  resolved?: boolean;
  adminReply?: string;
  repliedAt?: string;
}

interface DeliverableFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  clientUid?: string;
  clientName?: string;
  deliverable: {
    name: string;
    url?: string;
    type?: string;
    size?: number;
    uploadedAt?: string;
    feedback?: DeliverableFeedbackItem[];
  };
  onFeedbackSaved?: () => void;
}

export const DeliverableFeedbackModal: React.FC<DeliverableFeedbackModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  clientUid,
  clientName,
  deliverable,
  onFeedbackSaved,
}) => {
  const { user, profile, isAdmin } = useAuth();
  const [comment, setComment] = useState('');
  const [feedbackType, setFeedbackType] = useState<'revision' | 'clarification' | 'approval' | 'general'>('revision');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [replyText, setReplyText] = useState<{ [feedbackId: string]: string }>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFeedbackList: DeliverableFeedbackItem[] = deliverable.feedback || [];

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !projectId) return;

    setIsSubmitting(true);
    try {
      const senderDisplayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || (isAdmin ? 'Admin Lead' : 'Client');
      const senderEmail = user?.email || 'client@theartificialbridge.com';
      const role: 'client' | 'admin' = isAdmin ? 'admin' : 'client';

      const newFeedbackEntry: DeliverableFeedbackItem = {
        id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderUid: user?.uid || 'unknown',
        senderName: senderDisplayName,
        senderEmail,
        senderRole: role,
        type: feedbackType,
        priority,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        resolved: feedbackType === 'approval',
      };

      // Retrieve latest project doc to safely update deliverables array
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const deliverables = projectData.deliverables || [];

        // Find and update the deliverable matching either url or name
        const updatedDeliverables = deliverables.map((del: any) => {
          const isMatch = (del.url && del.url === deliverable.url) || (del.name === deliverable.name && del.uploadedAt === deliverable.uploadedAt);
          if (isMatch) {
            const existingFeedback = del.feedback || [];
            return {
              ...del,
              feedback: [newFeedbackEntry, ...existingFeedback]
            };
          }
          return del;
        });

        await updateDoc(projectRef, {
          deliverables: updatedDeliverables
        });
      }

      // Notify Admins
      await sendNotification({
        userId: 'admin_global',
        title: `Deliverable Feedback: ${deliverable.name}`,
        message: `${senderDisplayName} submitted ${feedbackType.toUpperCase()} feedback (${priority} priority) on deliverable "${deliverable.name}" for project "${projectTitle}": "${comment.trim()}"`,
        type: priority === 'urgent' ? 'alert' : 'update'
      });

      // If submitted by Admin, notify the Client as well
      if (isAdmin && clientUid) {
        await sendNotification({
          userId: clientUid,
          title: `Admin Feedback on ${deliverable.name}`,
          message: `The project team left feedback on "${deliverable.name}" in project "${projectTitle}".`,
          type: 'update'
        });
      }

      // Audit Log
      await logAuditEvent({
        action: 'DELIVERABLE_FEEDBACK_SUBMITTED',
        category: 'status_change',
        actorEmail: senderEmail,
        actorName: senderDisplayName,
        actorRole: role,
        targetEntity: 'deliverable',
        targetId: deliverable.name,
        targetTitle: deliverable.name,
        details: `Submitted [${feedbackType.toUpperCase()}] feedback with [${priority.toUpperCase()}] priority on "${deliverable.name}" for project "${projectTitle}".`
      });

      setIsSuccess(true);
      setComment('');
      if (onFeedbackSaved) onFeedbackSaved();

      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      handleFirestoreError(err, OperationType.UPDATE, `projects/${projectId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminReply = async (feedbackId: string) => {
    const reply = replyText[feedbackId];
    if (!reply?.trim()) return;

    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const deliverables = projectData.deliverables || [];

        const updatedDeliverables = deliverables.map((del: any) => {
          const isMatch = (del.url && del.url === deliverable.url) || (del.name === deliverable.name && del.uploadedAt === deliverable.uploadedAt);
          if (isMatch && del.feedback) {
            const updatedFeedback = del.feedback.map((fb: DeliverableFeedbackItem) => {
              if (fb.id === feedbackId) {
                return {
                  ...fb,
                  adminReply: reply.trim(),
                  repliedAt: new Date().toISOString(),
                  resolved: true
                };
              }
              return fb;
            });
            return { ...del, feedback: updatedFeedback };
          }
          return del;
        });

        await updateDoc(projectRef, {
          deliverables: updatedDeliverables
        });

        // Notify original sender
        const targetFeedback = currentFeedbackList.find(f => f.id === feedbackId);
        if (targetFeedback && targetFeedback.senderUid && targetFeedback.senderUid !== user?.uid) {
          await sendNotification({
            userId: targetFeedback.senderUid,
            title: `Reply to Feedback on ${deliverable.name}`,
            message: `Admin replied to your comment on "${deliverable.name}": "${reply.trim()}"`,
            type: 'update'
          });
        }

        setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
        setReplyingTo(null);
        if (onFeedbackSaved) onFeedbackSaved();
      }
    } catch (error) {
      console.error('Failed to reply to feedback:', error);
    }
  };

  const handleToggleResolve = async (feedbackId: string, currentResolved?: boolean) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const deliverables = projectData.deliverables || [];

        const updatedDeliverables = deliverables.map((del: any) => {
          const isMatch = (del.url && del.url === deliverable.url) || (del.name === deliverable.name && del.uploadedAt === deliverable.uploadedAt);
          if (isMatch && del.feedback) {
            const updatedFeedback = del.feedback.map((fb: DeliverableFeedbackItem) => {
              if (fb.id === feedbackId) {
                return {
                  ...fb,
                  resolved: !currentResolved
                };
              }
              return fb;
            });
            return { ...del, feedback: updatedFeedback };
          }
          return del;
        });

        await updateDoc(projectRef, {
          deliverables: updatedDeliverables
        });

        if (onFeedbackSaved) onFeedbackSaved();
      }
    } catch (error) {
      console.error('Failed to toggle resolved status:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-vanta/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-vanta border border-gold/25 rounded-3xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gold/15 bg-gradient-to-r from-gold/[0.08] via-vanta to-gold/[0.03] flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-[9px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5">
                <MessageSquare size={10} />
                Deliverable Feedback Channel
              </span>
              <span className="text-[10px] font-mono text-oat/40 uppercase">
                {projectTitle}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-oat tracking-tight flex items-center gap-2">
              {deliverable.name}
            </h3>
            <p className="text-xs font-mono text-oat/50 flex items-center gap-2">
              <span>Attached to: <strong className="text-gold/80">{projectTitle}</strong></span>
              {deliverable.uploadedAt && (
                <>
                  <span className="text-oat/20">•</span>
                  <span>Uploaded {new Date(deliverable.uploadedAt).toLocaleDateString()}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {deliverable.url && (
              <a
                href={deliverable.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 transition-all text-xs flex items-center gap-1"
                title="Open Deliverable Artifact"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-oat/40 hover:text-oat hover:bg-gold/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Submission Form */}
          <form onSubmit={handleSendFeedback} className="space-y-5 bg-gold/[0.03] border border-gold/15 rounded-2xl p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                <Sparkles size={13} />
                {isAdmin ? 'Leave Feedback or Request Clarification' : 'Send Feedback to Admin Team'}
              </h4>
              <span className="text-[9px] font-mono text-oat/40">
                Direct Admin Alert
              </span>
            </div>

            {/* Category / Type Selector */}
            <div className="space-y-2">
              <label className="block text-[9px] font-mono text-oat/60 uppercase tracking-widest">
                Feedback Intent
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'revision', label: 'Revision Request', icon: AlertCircle, color: 'text-amber-400 border-amber-400/30' },
                  { id: 'clarification', label: 'Clarification', icon: HelpCircle, color: 'text-blue-400 border-blue-400/30' },
                  { id: 'approval', label: 'Sign-off / Approved', icon: CheckSquare, color: 'text-emerald-400 border-emerald-400/30' },
                  { id: 'general', label: 'General Note', icon: MessageSquare, color: 'text-gold border-gold/30' },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = feedbackType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeedbackType(item.id as any)}
                      className={`p-2.5 rounded-xl border text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center ${
                        isSelected
                          ? `bg-gold/20 font-bold ${item.color} shadow-sm`
                          : 'border-gold/10 bg-vanta/60 text-oat/50 hover:text-oat hover:border-gold/20'
                      }`}
                    >
                      <Icon size={12} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-mono text-oat/60 uppercase tracking-widest">
                Priority:
              </span>
              <div className="flex items-center gap-2">
                {(['normal', 'high', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`px-3 py-1 rounded-lg text-[9px] font-mono uppercase tracking-widest border transition-all ${
                      priority === p
                        ? p === 'urgent'
                          ? 'bg-red-500/20 text-red-400 border-red-400 font-bold'
                          : p === 'high'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-400 font-bold'
                          : 'bg-gold/20 text-gold border-gold font-bold'
                        : 'border-gold/10 text-oat/40 hover:text-oat'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Text Area */}
            <div className="space-y-2">
              <label className="block text-[9px] font-mono text-oat/60 uppercase tracking-widest">
                Your Comments & Specific Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  feedbackType === 'revision'
                    ? 'Explain what revisions, adjustments, or additions are required for this deliverable...'
                    : feedbackType === 'clarification'
                    ? 'Ask a question or request clarification regarding this deliverable item...'
                    : feedbackType === 'approval'
                    ? 'Notes on approval or sign-off acceptance...'
                    : 'Provide general feedback or guidance to the project lead...'
                }
                rows={4}
                required
                className="w-full bg-vanta border border-gold/20 rounded-xl p-4 text-xs font-mono text-oat placeholder:text-oat/30 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all leading-relaxed"
              />
            </div>

            {/* Submit Action */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-oat/40">
                <User size={12} className="text-gold" />
                <span>Sending as: <strong className="text-oat/80">{profile?.displayName || user?.displayName || user?.email}</strong></span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !comment.trim()}
                className="px-6 py-2.5 bg-gold text-vanta font-black rounded-xl text-[10px] font-mono uppercase tracking-widest hover:bg-oat transition-all flex items-center gap-2 shadow-lg shadow-gold/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-vanta border-t-transparent rounded-full animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Submit Feedback to Admin</span>
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-mono"
                >
                  <CheckCircle2 size={16} />
                  <span>Feedback transmitted successfully. Admin notification triggered.</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Feedback Thread History */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase tracking-widest text-oat font-bold flex items-center gap-2">
                <Clock size={13} className="text-gold" />
                Feedback Thread & Revision Log ({currentFeedbackList.length})
              </h4>
              {currentFeedbackList.length > 0 && (
                <span className="text-[9px] font-mono text-oat/40">
                  {currentFeedbackList.filter(f => f.resolved).length} Resolved
                </span>
              )}
            </div>

            {currentFeedbackList.length === 0 ? (
              <div className="p-8 text-center border border-gold/10 bg-vanta/40 rounded-2xl space-y-2">
                <p className="text-xs font-mono text-oat/40">No feedback entries recorded yet for this deliverable.</p>
                <p className="text-[10px] font-mono text-oat/25">Use the form above to submit questions, review comments, or revision requests directly to the administration team.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentFeedbackList.map((item) => {
                  const isResolved = item.resolved;
                  const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'Recently';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 md:p-5 rounded-2xl border transition-all space-y-3 ${
                        isResolved
                          ? 'border-gold/10 bg-vanta/30 opacity-80'
                          : item.priority === 'urgent'
                          ? 'border-red-500/30 bg-red-500/[0.03]'
                          : 'border-gold/20 bg-vanta/70'
                      }`}
                    >
                      {/* Top Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            item.senderRole === 'admin' ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {item.senderName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-oat">{item.senderName}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-wider ${
                                item.senderRole === 'admin' ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-blue-400/10 text-blue-300 border border-blue-400/20'
                              }`}>
                                {item.senderRole}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-oat/40">{item.senderEmail}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-mono uppercase font-bold ${
                            item.type === 'revision' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                            item.type === 'clarification' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' :
                            item.type === 'approval' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                            'bg-gold/10 text-gold border border-gold/20'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-[9px] font-mono text-oat/40">{dateStr}</span>
                        </div>
                      </div>

                      {/* Comment body */}
                      <p className="text-xs text-oat/90 font-mono leading-relaxed bg-vanta p-3 rounded-xl border border-gold/10">
                        {item.comment}
                      </p>

                      {/* Admin Reply Display if exists */}
                      {item.adminReply && (
                        <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl space-y-1.5 pl-4">
                          <div className="flex items-center justify-between text-[9px] font-mono text-gold uppercase tracking-wider">
                            <span className="flex items-center gap-1 font-bold">
                              <ShieldCheck size={12} />
                              Admin Response:
                            </span>
                            {item.repliedAt && (
                              <span className="text-oat/40">
                                {new Date(item.repliedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-oat font-mono leading-relaxed">{item.adminReply}</p>
                        </div>
                      )}

                      {/* Action Bar (Admin reply / Resolve toggle) */}
                      <div className="flex items-center justify-between pt-1 border-t border-gold/10">
                        <button
                          onClick={() => handleToggleResolve(item.id, item.resolved)}
                          className={`text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                            item.resolved ? 'text-emerald-400 hover:text-emerald-300' : 'text-oat/40 hover:text-gold'
                          }`}
                        >
                          <CheckCircle2 size={12} className={item.resolved ? 'text-emerald-400' : 'text-oat/30'} />
                          <span>{item.resolved ? 'Marked Resolved' : 'Mark as Resolved'}</span>
                        </button>

                        {isAdmin && !item.adminReply && replyingTo !== item.id && (
                          <button
                            onClick={() => setReplyingTo(item.id)}
                            className="text-[9px] font-mono uppercase tracking-wider text-gold hover:text-oat transition-colors"
                          >
                            Reply to Client
                          </button>
                        )}
                      </div>

                      {/* Admin inline reply form */}
                      {replyingTo === item.id && (
                        <div className="pt-2 space-y-2">
                          <textarea
                            value={replyText[item.id] || ''}
                            onChange={(e) => setReplyText({ ...replyText, [item.id]: e.target.value })}
                            placeholder="Type admin reply to this feedback..."
                            rows={2}
                            className="w-full bg-vanta border border-gold/30 rounded-xl p-3 text-xs font-mono text-oat placeholder:text-oat/30 focus:outline-none focus:border-gold"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1 text-[9px] font-mono text-oat/40 hover:text-oat uppercase"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAdminReply(item.id)}
                              disabled={!replyText[item.id]?.trim()}
                              className="px-4 py-1 bg-gold text-vanta font-bold rounded-lg text-[9px] font-mono uppercase tracking-wider hover:bg-oat disabled:opacity-50"
                            >
                              Send Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-gold/15 bg-gold/[0.02] flex items-center justify-between">
          <span className="text-[9px] font-mono text-oat/40">
            All feedback updates are synced directly with the Project Manager timeline and admin alerts.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 border border-gold/20 hover:bg-gold/10 text-gold text-[10px] font-mono uppercase tracking-widest rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
