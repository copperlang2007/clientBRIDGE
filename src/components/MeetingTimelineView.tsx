import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, Circle, FileText, 
  ExternalLink, Sparkles, Copy, Check, ChevronDown, 
  ChevronUp, Share2, ShieldCheck, FileCheck, DollarSign, 
  Filter, Layers, ArrowRight, Play, RefreshCw, Plus, Tag,
  FolderGit2, ListTodo, AlertTriangle, Download
} from 'lucide-react';
import { 
  GoogleMeeting, 
  ActionableTask, 
  generateGoogleCalendarLink, 
  downloadICSFile,
  createGoogleCalendarEvent,
  updateMeetingDetails,
  summarizeMeetingWithAI,
  exportMeetingToPDF,
  syncActionTasksToProject
} from '../services/googleMeet';

interface MeetingTimelineViewProps {
  meetings: GoogleMeeting[];
  contracts?: any[];
  projects?: any[];
  onJoinMeeting: (meeting: GoogleMeeting) => void;
}

export const MeetingTimelineView: React.FC<MeetingTimelineViewProps> = ({
  meetings,
  contracts = [],
  projects = [],
  onJoinMeeting
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSummarizingId, setIsSummarizingId] = useState<string | null>(null);
  const [calSyncedId, setCalSyncedId] = useState<string | null>(null);
  const [isSyncingProjectId, setIsSyncingProjectId] = useState<string | null>(null);
  const [syncedFeedbackId, setSyncedFeedbackId] = useState<string | null>(null);

  const handleSyncTasks = async (meeting: GoogleMeeting) => {
    const tasksToSync = meeting.tasks || meeting.summary?.actionableTasks || [];
    if (tasksToSync.length === 0) return;

    setIsSyncingProjectId(meeting.id);
    try {
      await syncActionTasksToProject({
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        tasks: tasksToSync,
        linkedContractId: meeting.linkedContractId,
        milestoneTitle: meeting.milestoneTitle,
        meetingPhase: meeting.meetingPhase,
        clientName: meeting.clientName,
        clientEmail: meeting.clientEmail
      });
      setSyncedFeedbackId(meeting.id);
      setTimeout(() => setSyncedFeedbackId(null), 4000);
    } catch (err) {
      console.error('Failed to sync tasks to project:', err);
    } finally {
      setIsSyncingProjectId(null);
    }
  };

  // Extract unique projects/clients from meetings and contracts
  const projectList = Array.from(new Set([
    ...meetings.map(m => m.clientName || m.linkedContractId || 'Apex Health Systems'),
    ...contracts.map(c => c.title || c.targetWedge || 'Reconciliation Engine')
  ])).filter(Boolean);

  // Filter meetings for the timeline
  const timelineMeetings = meetings
    .filter(m => {
      const matchProject = selectedProjectId === 'all' || 
        (m.clientName === selectedProjectId) || 
        (m.linkedContractId === selectedProjectId) ||
        (m.title && m.title.toLowerCase().includes(selectedProjectId.toLowerCase()));
      
      const matchPhase = selectedPhase === 'all' || m.meetingPhase === selectedPhase;
      return matchProject && matchPhase;
    })
    .sort((a, b) => new Date(b.scheduledTime || b.createdAt).getTime() - new Date(a.scheduledTime || a.createdAt).getTime());

  const handleCopyLink = (uri: string, id: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleToggleTask = async (meeting: GoogleMeeting, taskId: string) => {
    if (!meeting.tasks) return;
    const updatedTasks = meeting.tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'DONE' ? 'TODO' : 'DONE';
        return { 
          ...t, 
          status: nextStatus as 'TODO' | 'IN_PROGRESS' | 'DONE',
          completedAt: nextStatus === 'DONE' ? new Date().toISOString() : undefined 
        };
      }
      return t;
    });

    await updateMeetingDetails(meeting.id, { tasks: updatedTasks });
  };

  const handleRunAISummarizer = async (meeting: GoogleMeeting) => {
    setIsSummarizingId(meeting.id);
    try {
      const summary = await summarizeMeetingWithAI({
        meetingTitle: meeting.title,
        meetingPhase: meeting.meetingPhase,
        clientName: meeting.clientName,
        agenda: meeting.agenda,
        notes: meeting.notes,
        transcript: meeting.transcript,
        linkedContractId: meeting.linkedContractId,
        milestoneTitle: meeting.milestoneTitle
      });

      await updateMeetingDetails(meeting.id, {
        summary: summary,
        tasks: summary.actionableTasks || meeting.tasks
      });
      setExpandedMeetingId(meeting.id);
    } catch (err) {
      console.error('Error generating AI tasks:', err);
    } finally {
      setIsSummarizingId(null);
    }
  };

  const handleCalendarSync = async (meeting: GoogleMeeting) => {
    setCalSyncedId(meeting.id);
    await createGoogleCalendarEvent(meeting);
    const gcalUrl = generateGoogleCalendarLink(meeting);
    window.open(gcalUrl, '_blank');
    setTimeout(() => setCalSyncedId(null), 3000);
  };

  const getPhaseBadge = (phase?: string) => {
    switch (phase) {
      case 'phase1-discovery':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] rounded font-bold uppercase">Phase 1: Discovery</span>;
      case 'phase2-sprint':
        return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded font-bold uppercase">Phase 2: Sprint</span>;
      case 'phase3-verify':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] rounded font-bold uppercase">Phase 3: Acceptance</span>;
      default:
        return <span className="px-2 py-0.5 bg-gold/10 text-gold border border-gold/20 text-[10px] rounded font-bold uppercase">General Strategy</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline Controls Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-gold/10">
        <div>
          <h3 className="text-sm font-bold text-oat flex items-center gap-2">
            <Layers className="w-4 h-4 text-gold" />
            Project Meeting Timeline & Milestone Artifact Graph
          </h3>
          <p className="text-[11px] text-oat/60 mt-0.5">
            Chronological audit log of client conferences, linked SOW/contract artifacts, and Gemini task velocity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Project Selector */}
          <div className="flex items-center gap-1.5 bg-vanta px-2.5 py-1.5 border border-gold/20 rounded-lg text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-gold" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-oat text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-vanta text-oat">All Projects & Engagements</option>
              {projectList.map((p, idx) => (
                <option key={idx} value={p} className="bg-vanta text-oat">{p}</option>
              ))}
            </select>
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-1.5 bg-vanta px-2.5 py-1.5 border border-gold/20 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-gold" />
            <select
              value={selectedPhase}
              onChange={(e) => setSelectedPhase(e.target.value)}
              className="bg-transparent text-oat text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-vanta text-oat">All Phases</option>
              <option value="phase1-discovery" className="bg-vanta text-oat">Phase 1: Discovery</option>
              <option value="phase2-sprint" className="bg-vanta text-oat">Phase 2: Sprint Review</option>
              <option value="phase3-verify" className="bg-vanta text-oat">Phase 3: Acceptance</option>
              <option value="general" className="bg-vanta text-oat">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {timelineMeetings.length === 0 ? (
        <div className="p-12 text-center bg-vanta-light/20 border border-dashed border-gold/20 rounded-xl space-y-3">
          <Calendar className="w-10 h-10 text-gold/30 mx-auto" />
          <h4 className="text-sm font-bold text-oat">No Past Meetings Found for this Filter</h4>
          <p className="text-xs text-oat/60 max-w-md mx-auto">
            Schedule or initiate a Google Meet session with linked artifacts to build your chronological engagement record.
          </p>
        </div>
      ) : (
        /* Vertical Chronological Timeline */
        <div className="relative pl-6 md:pl-8 space-y-8 before:absolute before:left-3 md:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-gold before:via-gold/30 before:to-gold/5">
          {timelineMeetings.map((meeting, index) => {
            const isExpanded = expandedMeetingId === meeting.id;
            const tasks = meeting.tasks || meeting.summary?.actionableTasks || [];
            const completedTaskCount = tasks.filter(t => t.status === 'DONE').length;

            return (
              <div key={meeting.id} className="relative group">
                {/* Timeline Marker Dot */}
                <div className={`absolute -left-6 md:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${
                  meeting.status === 'live' 
                    ? 'bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/50 animate-pulse' 
                    : meeting.status === 'completed'
                    ? 'bg-vanta border-gold text-gold'
                    : 'bg-vanta border-blue-400 text-blue-400'
                }`}>
                  {meeting.status === 'live' ? (
                    <Play className="w-2.5 h-2.5 text-vanta fill-vanta ml-0.5" />
                  ) : meeting.status === 'completed' ? (
                    <Check className="w-3 h-3 text-gold" />
                  ) : (
                    <Clock className="w-3 h-3 text-blue-400" />
                  )}
                </div>

                {/* Timeline Card */}
                <div className="bg-vanta-light/40 border border-gold/20 rounded-xl p-4 md:p-5 space-y-4 hover:border-gold/50 transition-all shadow-lg">
                  {/* Card Top Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPhaseBadge(meeting.meetingPhase)}

                        <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                          meeting.status === 'live'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : meeting.status === 'scheduled'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {meeting.status}
                        </span>

                        <span className="text-xs font-mono text-oat/50">{meeting.meetingCode}</span>

                        {meeting.durationMinutes && (
                          <span className="text-[11px] text-oat/60 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-gold" />
                            {meeting.durationMinutes} mins
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm md:text-base font-bold text-oat mt-1">
                        {meeting.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-oat/60 flex-wrap">
                        <span>
                          {new Date(meeting.scheduledTime || meeting.createdAt).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {meeting.clientName && (
                          <span className="text-gold font-medium">
                            · Client: {meeting.clientName}
                          </span>
                        )}
                        {meeting.milestoneTitle && (
                          <span className="text-amber-300/80">
                            · Milestone: {meeting.milestoneTitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Card Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {/* PDF Report Export Button */}
                      <button
                        onClick={() => exportMeetingToPDF(meeting)}
                        className="p-2 bg-vanta hover:bg-gold/10 text-gold border border-gold/30 rounded-lg text-xs flex items-center gap-1.5 font-bold"
                        title="Download PDF Executive Report"
                      >
                        <Download className="w-3.5 h-3.5 text-gold" />
                        <span className="hidden sm:inline">PDF</span>
                      </button>

                      {/* Calendar Sync Button */}
                      <button
                        onClick={() => handleCalendarSync(meeting)}
                        className="p-2 bg-vanta hover:bg-gold/10 text-oat/80 border border-gold/20 rounded-lg text-xs flex items-center gap-1.5"
                        title="Add to Google Calendar"
                      >
                        <Calendar className="w-3.5 h-3.5 text-gold" />
                        <span className="hidden sm:inline">G-Cal</span>
                      </button>

                      {/* Download ICS */}
                      <button
                        onClick={() => downloadICSFile(meeting)}
                        className="p-2 bg-vanta hover:bg-gold/10 text-oat/80 border border-gold/20 rounded-lg text-xs"
                        title="Download iCal (.ics)"
                      >
                        <FileText className="w-3.5 h-3.5 text-oat/60" />
                      </button>

                      {/* Join / Start */}
                      <button
                        onClick={() => onJoinMeeting(meeting)}
                        className="px-3 py-1.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded-lg text-xs flex items-center gap-1.5 shadow"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {meeting.status === 'live' ? 'Join Call' : 'Launch Meet'}
                      </button>

                      {/* Expand Details Toggle */}
                      <button
                        onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                        className="p-1.5 text-oat/60 hover:text-gold transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Agenda summary snippet */}
                  {meeting.agenda && (
                    <p className="text-xs text-oat/70 bg-vanta/40 p-2.5 rounded-lg border border-gold/5">
                      <strong className="text-gold">Agenda:</strong> {meeting.agenda}
                    </p>
                  )}

                  {/* Linked Project Artifacts Badges */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] uppercase tracking-wider text-oat/40 font-bold">
                      Linked Artifacts:
                    </span>

                    {/* SOW Link */}
                    <div className="px-2.5 py-1 bg-vanta border border-gold/20 rounded text-[11px] text-oat flex items-center gap-1.5">
                      <FileCheck className="w-3 h-3 text-gold" />
                      <span>SOW Spec (Engage v1)</span>
                    </div>

                    {/* Acceptance Contract */}
                    <div className="px-2.5 py-1 bg-vanta border border-gold/20 rounded text-[11px] text-oat flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>AC W0.2 (Boundary Spec)</span>
                    </div>

                    {/* Milestone / Invoice */}
                    <div className="px-2.5 py-1 bg-vanta border border-gold/20 rounded text-[11px] text-oat flex items-center gap-1.5">
                      <DollarSign className="w-3 h-3 text-amber-400" />
                      <span>Milestone Floor ($12k)</span>
                    </div>

                    {tasks.length > 0 && (
                      <span className="px-2.5 py-1 bg-emerald-950/40 border border-emerald-500/30 rounded text-[11px] text-emerald-300 font-mono">
                        {completedTaskCount}/{tasks.length} Tasks Done
                      </span>
                    )}
                  </div>

                  {/* Expandable Section: Gemini AI Summary, Notes & Task Checklist */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-gold/10 space-y-4">
                      {/* AI Summarization Button & Status */}
                      <div className="flex items-center justify-between bg-gold/5 p-3 rounded-lg border border-gold/20">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-gold" />
                          <div>
                            <p className="text-xs font-bold text-oat">Gemini Meeting Transcription & Task Engine</p>
                            <p className="text-[10px] text-oat/50">Auto-synthesizes call notes into verified tasks and key decisions.</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRunAISummarizer(meeting)}
                          disabled={isSummarizingId === meeting.id}
                          className="px-3 py-1.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded text-xs flex items-center gap-1.5 shadow disabled:opacity-50"
                        >
                          {isSummarizingId === meeting.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {isSummarizingId === meeting.id ? 'Synthesizing...' : 'Synthesize AI Summary'}
                        </button>
                      </div>

                      {/* Gemini Executive Summary (if present) */}
                      {meeting.summary && (
                        <div className="p-3.5 bg-vanta border border-gold/20 rounded-lg space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Executive Call Summary
                            </h5>

                            <div className="flex items-center gap-2">
                              {/* Sync to Project Button */}
                              <button
                                onClick={() => handleSyncTasks(meeting)}
                                disabled={isSyncingProjectId === meeting.id || tasks.length === 0}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all shadow ${
                                  syncedFeedbackId === meeting.id || meeting.isSyncedToProject
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                                } disabled:opacity-50`}
                                title="Push extracted tasks directly to the Project Task Board"
                              >
                                {isSyncingProjectId === meeting.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : syncedFeedbackId === meeting.id || meeting.isSyncedToProject ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <FolderGit2 className="w-3 h-3 text-gold" />
                                )}
                                {isSyncingProjectId === meeting.id
                                  ? 'Syncing to Board...'
                                  : syncedFeedbackId === meeting.id
                                  ? 'Synced to Project!'
                                  : meeting.isSyncedToProject
                                  ? 'Re-Sync to Project'
                                  : 'Sync to Project'}
                              </button>

                              <button
                                onClick={() => exportMeetingToPDF(meeting)}
                                className="px-2.5 py-1 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                                title="Download Full PDF Summary Report"
                              >
                                <Download className="w-3 h-3" />
                                PDF Report
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-oat/80 leading-relaxed">
                            {meeting.summary.executiveSummary}
                          </p>

                          {meeting.summary.keyDecisions?.length > 0 && (
                            <div className="pt-2 border-t border-gold/10">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                Key Decisions Made:
                              </span>
                              <ul className="list-disc list-inside text-xs text-oat/70 mt-1 space-y-0.5">
                                {meeting.summary.keyDecisions.map((decision, dIdx) => (
                                  <li key={dIdx}>{decision}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {meeting.summary.blockersAndRisks?.length > 0 && (
                            <div className="pt-2 border-t border-gold/10">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                                Landmines & Blockers Identified:
                              </span>
                              <ul className="list-disc list-inside text-xs text-rose-300/80 mt-1 space-y-0.5">
                                {meeting.summary.blockersAndRisks.map((risk, rIdx) => (
                                  <li key={rIdx}>{risk}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meeting Actionable Tasks Checklist */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-oat flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5 text-gold" />
                            Actionable Project Tasks ({tasks.length})
                          </h5>
                          <span className="text-[10px] text-oat/50">
                            Click to toggle task status
                          </span>
                        </div>

                        {tasks.length === 0 ? (
                          <p className="text-xs text-oat/40 italic p-3 bg-vanta/30 rounded border border-gold/5">
                            No tasks extracted yet. Click "Synthesize AI Summary" above to auto-extract tasks from notes.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {tasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleToggleTask(meeting, task.id)}
                                className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                                  task.status === 'DONE'
                                    ? 'bg-vanta/20 border-emerald-500/20 text-oat/40'
                                    : 'bg-vanta/70 border-gold/20 hover:border-gold/50 text-oat'
                                }`}
                              >
                                <button className="mt-0.5 text-gold">
                                  {task.status === 'DONE' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gold/60" />
                                  )}
                                </button>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={`text-xs font-semibold ${task.status === 'DONE' ? 'line-through' : ''}`}>
                                      {task.title}
                                    </p>
                                    <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${
                                      task.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                                      task.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' :
                                      'bg-blue-500/20 text-blue-300'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-oat/60 mt-0.5">
                                    {task.description}
                                  </p>

                                  <div className="flex items-center gap-3 text-[10px] text-oat/40 mt-1">
                                    <span>Assignee: <strong className="text-oat/70">{task.assignee}</strong></span>
                                    <span>Due: <strong className="text-oat/70">{task.dueDate}</strong></span>
                                    {task.verificationCriteria && (
                                      <span>Verification: <strong className="text-emerald-400/80">{task.verificationCriteria}</strong></span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recorded Scratchpad Notes */}
                      {meeting.notes && (
                        <div className="p-3 bg-vanta/50 rounded-lg border border-gold/10 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-gold tracking-wider">
                            Conference Scratchpad Notes
                          </span>
                          <p className="text-xs text-oat/70 whitespace-pre-wrap font-mono">
                            {meeting.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
