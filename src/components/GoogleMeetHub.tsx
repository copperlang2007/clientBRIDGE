import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Plus, Calendar, Clock, Link as LinkIcon, Copy, Check, 
  Users, ShieldCheck, FileText, PhoneOff, ExternalLink, Sparkles, 
  MessageSquare, RefreshCw, Lock, Globe, Radio, Search, Filter, 
  Trash2, Share2, Mic, MicOff, Camera, Maximize2, Minimize2, X,
  Layers, BarChart3, ListTodo, Circle, CheckCircle2, AlertTriangle,
  FolderGit2, Download, ArrowUpRight, Award, Zap, Bot, BrainCircuit
} from 'lucide-react';
import { 
  GoogleMeeting, 
  ActionableTask,
  createGoogleMeetSpace, 
  endGoogleMeetConference, 
  updateMeetingDetails, 
  deleteMeetingRecord, 
  subscribeToMeetings,
  getGoogleMeetAccessToken,
  generateGoogleCalendarLink,
  downloadICSFile,
  createGoogleCalendarEvent,
  summarizeMeetingWithAI,
  exportMeetingToPDF,
  syncActionTasksToProject
} from '../services/googleMeet';
import { useAuth } from '../contexts/AuthContext';
import { MeetingAnalyticsDashboard } from './MeetingAnalyticsDashboard';
import { MeetingTimelineView } from './MeetingTimelineView';
import { ActiveAgentsBar } from './ActiveAgentsBar';
import { PersonaSelectorModal } from './PersonaSelectorModal';
import { LiveSentimentGauge } from './LiveSentimentGauge';
import { InMeetingAgentFeed } from './InMeetingAgentFeed';
import { 
  MeetingPersona, 
  AgentIntervention, 
  MeetingSentimentAnalysis 
} from '../types/meetingAgents';
import { 
  DEFAULT_MEETING_PERSONAS, 
  voiceAgentEngine,
  triggerAgentIntervention 
} from '../services/voiceAgentService';

interface GoogleMeetHubProps {
  initialPhase?: 'phase1-discovery' | 'phase2-sprint' | 'phase3-verify' | 'phase3-verification' | 'general';
  linkedContractId?: string;
  clientEmail?: string;
  clientName?: string;
  initialAgenda?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export const GoogleMeetHub: React.FC<GoogleMeetHubProps> = ({
  initialPhase = 'general',
  linkedContractId,
  clientEmail = '',
  clientName = '',
  initialAgenda,
  onClose,
  isModal = false
}) => {
  const { user, profile, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<GoogleMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'hub' | 'timeline' | 'analytics' | 'schedule' | 'active_call'>('hub');
  const [activeMeeting, setActiveMeeting] = useState<GoogleMeeting | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<string>('all');
  const [hasTasksFilter, setHasTasksFilter] = useState<string>('all');
  const [isSyncingProjectId, setIsSyncingProjectId] = useState<string | null>(null);
  const [syncedFeedbackId, setSyncedFeedbackId] = useState<string | null>(null);
  const [inspectingMeeting, setInspectingMeeting] = useState<GoogleMeeting | null>(null);
  const [inspectingMeetingDraftTasks, setInspectingMeetingDraftTasks] = useState<ActionableTask[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [calSyncSuccess, setCalSyncSuccess] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Strategic AI Voice Personas state
  const [personas, setPersonas] = useState<MeetingPersona[]>(() => {
    const saved = localStorage.getItem('ab_meeting_personas');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_MEETING_PERSONAS;
      }
    }
    return DEFAULT_MEETING_PERSONAS;
  });
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);
  const [interventions, setInterventions] = useState<AgentIntervention[]>([]);
  const [liveSentiment, setLiveSentiment] = useState<MeetingSentimentAnalysis | null>(null);

  // Sync personas to localStorage
  const handleUpdatePersonas = (updated: MeetingPersona[]) => {
    setPersonas(updated);
    try {
      localStorage.setItem('ab_meeting_personas', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist personas in localStorage:', e);
    }
  };

  // Listen to voice synthesis status changes
  useEffect(() => {
    const unsubscribe = voiceAgentEngine.onStatusChange((personaId, status) => {
      if (status === 'speaking') {
        setActiveSpeakingId(personaId);
      } else {
        setActiveSpeakingId(null);
      }
      setPersonas(prev => prev.map(p => {
        if (p.id === personaId) {
          return { ...p, status: status === 'speaking' ? 'speaking' : p.isAttending ? 'listening' : 'idle' };
        }
        return p;
      }));
    });
    return () => unsubscribe();
  }, []);

  const handleTogglePersonaMute = (personaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPersonas(prev => prev.map(p => {
      if (p.id === personaId) {
        const nextMuted = !p.isMuted;
        if (nextMuted && activeSpeakingId === personaId) {
          voiceAgentEngine.stopSpeaking(personaId);
          setActiveSpeakingId(null);
        }
        return { ...p, isMuted: nextMuted };
      }
      return p;
    }));
  };

  const handleTriggerAutonomousIntervention = async (persona: MeetingPersona) => {
    if (!activeMeeting) {
      // If not in active meeting, create or switch to instant session
      setActiveTab('active_call');
    }
    try {
      setPersonas(prev => prev.map(p => p.id === persona.id ? { ...p, status: 'processing' } : p));
      const intervention = await triggerAgentIntervention({
        persona,
        meetingTitle: activeMeeting?.title || 'Client Strategy Session',
        meetingPhase: activeMeeting?.meetingPhase || 'general',
        clientName: activeMeeting?.clientName || 'Client Participant',
        notes: notesDraft || activeMeeting?.notes,
        transcript: transcriptDraft || activeMeeting?.transcript,
        agenda: activeMeeting?.agenda,
        milestoneTitle: activeMeeting?.milestoneTitle
      });

      setInterventions(prev => [intervention, ...prev]);

      if (!persona.isMuted) {
        setActiveSpeakingId(persona.id);
        await voiceAgentEngine.speak(persona, intervention.spokenText);
        setActiveSpeakingId(null);
      }
    } catch (err) {
      console.error('Trigger intervention error:', err);
    } finally {
      setPersonas(prev => prev.map(p => p.id === persona.id ? { ...p, status: p.isAttending ? 'listening' : 'idle' } : p));
    }
  };

  const handleSelectPersonaForQuery = (persona: MeetingPersona) => {
    if (!activeMeeting && meetings.length > 0) {
      setActiveMeeting(meetings[0]);
    }
    setActiveTab('active_call');
  };

  // Normalized phase
  const normalizedPhase: 'phase1-discovery' | 'phase2-sprint' | 'phase3-verify' | 'general' = 
    initialPhase === 'phase3-verification' ? 'phase3-verify' : initialPhase;

  // New Meeting Form state
  const [formData, setFormData] = useState({
    title: normalizedPhase === 'phase1-discovery' 
      ? 'Phase 1: Discovery & Scoping Session'
      : normalizedPhase === 'phase2-sprint'
      ? 'Phase 2: Sprint Review & Deterministic Demo'
      : normalizedPhase === 'phase3-verify'
      ? 'Phase 3: Acceptance Verification Walkthrough'
      : 'Client Strategy & Architectural Alignment',
    clientName: clientName || '',
    clientEmail: clientEmail || '',
    accessType: 'OPEN' as 'OPEN' | 'TRUSTED' | 'RESTRICTED',
    meetingPhase: normalizedPhase,
    milestoneTitle: normalizedPhase === 'phase1-discovery'
      ? 'Milestone 1: Acceptance Contract Sign-Off'
      : normalizedPhase === 'phase2-sprint'
      ? 'Milestone 2: Reconciler Engine Build & Staged Evidence'
      : normalizedPhase === 'phase3-verify'
      ? 'Milestone 3: Acceptance Overseer Verification Release'
      : 'Core Project Milestone Delivery',
    durationMinutes: 30,
    syncToGoogleCalendar: true,
    scheduledDate: new Date(Date.now() + 3600000).toISOString().split('T')[0],
    scheduledTime: '14:00',
    agenda: initialAgenda || (normalizedPhase === 'phase1-discovery'
      ? 'Define operational pain points, examine raw EDI/claims data samples, and formulate W0.2 Acceptance Contract pass_conditions.'
      : normalizedPhase === 'phase2-sprint'
      ? 'Demonstrate $0-cost deterministic pipeline execution and review isolated build artifacts.'
      : normalizedPhase === 'phase3-verify'
      ? 'Review automated multi-round Overseer verdict table, Law 9 proof pointers, and execute SOW / milestone invoice release.'
      : 'Review project milestones, architectural decisions, and next sprint priorities.'),
    isInstant: true
  });

  // Subscribe to real-time meetings
  useEffect(() => {
    const unsubscribe = subscribeToMeetings((fetchedMeetings) => {
      setMeetings(fetchedMeetings);
      setLoading(false);
      
      // Auto-attach active meeting if currently active
      if (activeMeeting) {
        const updated = fetchedMeetings.find(m => m.id === activeMeeting.id);
        if (updated) {
          setActiveMeeting(updated);
          setNotesDraft(updated.notes || '');
          if (updated.transcript) {
            setTranscriptDraft(updated.transcript);
          }
        }
      }
    }, {
      uid: user?.uid,
      email: user?.email,
      isAdmin,
      displayName: profile?.displayName || user?.displayName
    });

    return () => unsubscribe();
  }, [activeMeeting?.id, user?.uid, user?.email, isAdmin, profile?.displayName]);

  // Live Web Speech Audio Dictation Hook
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscriptDraft(prev => (prev ? prev + '\n' + finalTranscript : finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecordingAudio(false);
      };

      recognition.onend = () => {
        setIsRecordingAudio(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. You can type or paste meeting discussion points directly into the transcript box.');
      return;
    }

    if (isRecordingAudio) {
      recognitionRef.current.stop();
      setIsRecordingAudio(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecordingAudio(true);
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }
  };

  const handleCopyLink = (uri: string, id: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyInvitation = (meeting: GoogleMeeting) => {
    const inviteText = `You are invited to an artificialBRIDGE Google Meet session:
Title: ${meeting.title}
Join Google Meet: ${meeting.meetingUri}
Meeting Code: ${meeting.meetingCode}
Date/Time: ${new Date(meeting.scheduledTime || meeting.createdAt).toLocaleString()}
${meeting.milestoneTitle ? `Milestone: ${meeting.milestoneTitle}\n` : ''}
Agenda: ${meeting.agenda || 'Client discussion'}`;
    
    navigator.clipboard.writeText(inviteText);
    setCopiedId(`invite_${meeting.id}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateInstantMeeting = async () => {
    setIsCreating(true);
    try {
      const meeting = await createGoogleMeetSpace({
        title: formData.title || 'Instant Client Strategy Session',
        accessType: formData.accessType,
        clientUid: '',
        clientEmail: formData.clientEmail || user?.email || '',
        clientName: formData.clientName || 'Client Participant',
        agenda: formData.agenda,
        linkedContractId: linkedContractId || '',
        meetingPhase: formData.meetingPhase,
        milestoneTitle: formData.milestoneTitle,
        durationMinutes: formData.durationMinutes
      });
      
      setActiveMeeting(meeting);
      setNotesDraft(meeting.notes || '');
      setTranscriptDraft('');
      setActiveTab('active_call');
      
      // Open Google Meet window
      window.open(meeting.meetingUri, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to create instant meeting:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}:00`).toISOString();
      const meeting = await createGoogleMeetSpace({
        title: formData.title,
        accessType: formData.accessType,
        clientEmail: formData.clientEmail,
        clientName: formData.clientName,
        scheduledTime: scheduledDateTime,
        agenda: formData.agenda,
        linkedContractId: linkedContractId || '',
        milestoneTitle: formData.milestoneTitle,
        durationMinutes: formData.durationMinutes,
        meetingPhase: formData.meetingPhase
      });

      if (formData.syncToGoogleCalendar) {
        await createGoogleCalendarEvent(meeting);
        const gcalUrl = generateGoogleCalendarLink(meeting);
        window.open(gcalUrl, '_blank');
      }

      setActiveTab('timeline');
      handleCopyLink(meeting.meetingUri, meeting.id);
    } catch (err) {
      console.error('Failed to schedule meeting:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinMeeting = (meeting: GoogleMeeting) => {
    setActiveMeeting(meeting);
    setNotesDraft(meeting.notes || '');
    setTranscriptDraft(meeting.transcript || '');
    updateMeetingDetails(meeting.id, { 
      status: 'live',
      startTime: meeting.startTime || new Date().toISOString()
    });
    setActiveTab('active_call');
    window.open(meeting.meetingUri, '_blank', 'noopener,noreferrer');
  };

  const handleEndMeeting = async (meeting: GoogleMeeting) => {
    if (isRecordingAudio && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecordingAudio(false);
    }

    if (confirm(`End active Google Meet conference for "${meeting.title}"? Duration will be calculated and logged.`)) {
      await endGoogleMeetConference(meeting.spaceName, meeting.id, meeting);
      if (activeMeeting?.id === meeting.id) {
        setActiveMeeting(null);
        setActiveTab('timeline');
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!activeMeeting) return;
    setIsSavingNotes(true);
    await updateMeetingDetails(activeMeeting.id, { 
      notes: notesDraft,
      transcript: transcriptDraft
    });
    setTimeout(() => setIsSavingNotes(false), 500);
  };

  const handleSynthesizeTasks = async () => {
    if (!activeMeeting) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeMeetingWithAI({
        meetingTitle: activeMeeting.title,
        meetingPhase: activeMeeting.meetingPhase,
        clientName: activeMeeting.clientName,
        agenda: activeMeeting.agenda,
        notes: notesDraft || activeMeeting.notes,
        transcript: transcriptDraft || activeMeeting.transcript,
        linkedContractId: activeMeeting.linkedContractId,
        milestoneTitle: activeMeeting.milestoneTitle
      });

      await updateMeetingDetails(activeMeeting.id, {
        notes: notesDraft,
        transcript: transcriptDraft,
        summary: summary,
        tasks: summary.actionableTasks || activeMeeting.tasks
      });

      // Update active meeting locally
      setActiveMeeting({
        ...activeMeeting,
        summary: summary,
        tasks: summary.actionableTasks
      });
    } catch (err) {
      console.error('Error generating AI tasks:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!activeMeeting || !activeMeeting.tasks) return;
    const updatedTasks = activeMeeting.tasks.map(t => {
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

    await updateMeetingDetails(activeMeeting.id, { tasks: updatedTasks });
    setActiveMeeting({ ...activeMeeting, tasks: updatedTasks });
  };

  const handleDelete = async (meetingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this meeting record?')) {
      await deleteMeetingRecord(meetingId);
    }
  };

  const handleDirectCalendarSync = async (meeting: GoogleMeeting) => {
    setCalSyncSuccess(meeting.id);
    await createGoogleCalendarEvent(meeting);
    const gcalUrl = generateGoogleCalendarLink(meeting);
    window.open(gcalUrl, '_blank');
    setTimeout(() => setCalSyncSuccess(null), 3000);
  };

  const handleExportPDF = (meetingToExport: GoogleMeeting, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      exportMeetingToPDF(meetingToExport);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const handleSyncTasksToProject = async (meeting: GoogleMeeting) => {
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

      // Update locally
      const updatedTasks = tasksToSync.map(t => ({ ...t, syncedToBoard: true }));
      if (activeMeeting?.id === meeting.id) {
        setActiveMeeting({
          ...activeMeeting,
          isSyncedToProject: true,
          tasks: updatedTasks
        });
      }
      if (inspectingMeeting?.id === meeting.id) {
        setInspectingMeeting({
          ...inspectingMeeting,
          isSyncedToProject: true,
          tasks: updatedTasks
        });
        setInspectingMeetingDraftTasks(updatedTasks);
      }

      setSyncedFeedbackId(meeting.id);
      setTimeout(() => setSyncedFeedbackId(null), 4000);
    } catch (err) {
      console.error('Failed to sync tasks to project:', err);
    } finally {
      setIsSyncingProjectId(null);
    }
  };

  const handleOpenInspector = (meeting: GoogleMeeting) => {
    setInspectingMeeting(meeting);
    setInspectingMeetingDraftTasks(meeting.tasks || meeting.summary?.actionableTasks || []);
  };

  const handleToggleInspectorTask = async (taskId: string) => {
    if (!inspectingMeeting) return;
    const currentTasks = inspectingMeetingDraftTasks;
    const updatedTasks = currentTasks.map(t => {
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

    setInspectingMeetingDraftTasks(updatedTasks);
    await updateMeetingDetails(inspectingMeeting.id, { tasks: updatedTasks });
    setInspectingMeeting({ ...inspectingMeeting, tasks: updatedTasks });
  };

  const handleRunInspectorSummary = async (meeting: GoogleMeeting) => {
    setIsSummarizing(true);
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

      setInspectingMeeting({
        ...meeting,
        summary: summary,
        tasks: summary.actionableTasks
      });
      setInspectingMeetingDraftTasks(summary.actionableTasks || []);
    } catch (err) {
      console.error('Error re-summarizing meeting:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const filteredMeetings = meetings.filter(m => {
    const query = searchQuery.trim().toLowerCase();
    
    // Keyword search across title, code, client info, notes, transcript, AI summary, decisions, risks, and tasks
    let matchesSearch = true;
    if (query) {
      const titleMatch = m.title?.toLowerCase().includes(query) || false;
      const clientMatch = (m.clientName && m.clientName.toLowerCase().includes(query)) ||
        (m.clientEmail && m.clientEmail.toLowerCase().includes(query)) || false;
      const codeMatch = (m.meetingCode && m.meetingCode.toLowerCase().includes(query)) || false;
      const notesMatch = (m.notes && m.notes.toLowerCase().includes(query)) || false;
      const transcriptMatch = (m.transcript && m.transcript.toLowerCase().includes(query)) || false;
      const summaryMatch = (m.summary?.executiveSummary && m.summary.executiveSummary.toLowerCase().includes(query)) || false;
      const decisionsMatch = (m.summary?.keyDecisions && m.summary.keyDecisions.some(d => d.toLowerCase().includes(query))) || false;
      const blockersMatch = (m.summary?.blockersAndRisks && m.summary.blockersAndRisks.some(r => r.toLowerCase().includes(query))) || false;
      const tasksMatch = (m.tasks && m.tasks.some(t => 
        t.title.toLowerCase().includes(query) || 
        t.description?.toLowerCase().includes(query) || 
        t.assignee?.toLowerCase().includes(query) ||
        t.verificationCriteria?.toLowerCase().includes(query)
      )) || false;
      const milestoneMatch = (m.milestoneTitle && m.milestoneTitle.toLowerCase().includes(query)) || false;

      matchesSearch = titleMatch || clientMatch || codeMatch || notesMatch || transcriptMatch || 
        summaryMatch || decisionsMatch || blockersMatch || tasksMatch || milestoneMatch;
    }

    // Phase Filter
    const matchesPhase = phaseFilter === 'all' || m.meetingPhase === phaseFilter;

    // Status Filter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'live' && m.status === 'live') ||
      (statusFilter === 'scheduled' && m.status === 'scheduled') ||
      (statusFilter === 'ended' && (m.status === 'completed' || m.status === 'cancelled'));

    // Sync Filter
    const matchesSync = syncFilter === 'all' ||
      (syncFilter === 'synced' && m.isSyncedToProject) ||
      (syncFilter === 'unsynced' && !m.isSyncedToProject && (m.tasks?.length || 0) > 0);

    // Has Tasks Filter
    const matchesHasTasks = hasTasksFilter === 'all' ||
      (hasTasksFilter === 'with_tasks' && (m.tasks?.length || 0) > 0) ||
      (hasTasksFilter === 'no_tasks' && (!m.tasks || m.tasks.length === 0));

    return matchesSearch && matchesPhase && matchesStatus && matchesSync && matchesHasTasks;
  });

  const activeLiveMeetings = meetings.filter(m => m.status === 'live');

  return (
    <div className={`flex flex-col h-full bg-vanta text-oat font-mono ${isModal ? 'max-h-[90vh] overflow-hidden rounded-xl border border-gold/30 shadow-2xl' : ''}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 bg-vanta-light/80 border-b border-gold/20 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-lg shadow-gold/5">
              <Video className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-oat tracking-wide flex items-center gap-2">
                  Google Meet Client Center
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-normal">
                    REST v2 Spaces
                  </span>
                  <span className="px-2 py-0.5 text-[10px] bg-gold/10 text-gold border border-gold/20 rounded font-normal">
                    Autonomous AI Board
                  </span>
                </h2>
              </div>
              <p className="text-xs text-oat/60">
                In-app video conferencing, autonomous voice AI attendee specialists, real-time sentiment gauge, and D3 analytics
              </p>
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-vanta p-1 border border-gold/20 rounded-lg">
              <button
                onClick={() => setActiveTab('hub')}
                className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 ${
                  activeTab === 'hub' ? 'bg-gold text-vanta font-bold shadow' : 'text-oat/70 hover:text-oat'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 ${
                  activeTab === 'timeline' ? 'bg-gold text-vanta font-bold shadow' : 'text-oat/70 hover:text-oat'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 ${
                  activeTab === 'analytics' ? 'bg-gold text-vanta font-bold shadow' : 'text-oat/70 hover:text-oat'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 text-xs rounded transition-all flex items-center gap-1.5 ${
                  activeTab === 'schedule' ? 'bg-gold text-vanta font-bold shadow' : 'text-oat/70 hover:text-oat'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
              </button>
            </div>

            {activeMeeting && activeTab !== 'active_call' && (
              <button
                onClick={() => setActiveTab('active_call')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs flex items-center gap-1.5 transition-all animate-pulse"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Live Call ({activeMeeting.meetingCode})</span>
              </button>
            )}

            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 text-oat/50 hover:text-oat hover:bg-white/5 rounded transition-all ml-1"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Visual 'Active Agents' Indicator Bar */}
        <ActiveAgentsBar
          personas={personas}
          onOpenPersonaManager={() => setIsPersonaModalOpen(true)}
          onSelectPersonaForQuery={handleSelectPersonaForQuery}
          onToggleMute={handleTogglePersonaMute}
          onTriggerAutonomousIntervention={handleTriggerAutonomousIntervention}
          activeSpeakingId={activeSpeakingId}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        
        {/* TAB: TIMELINE VIEW */}
        {activeTab === 'timeline' && (
          <MeetingTimelineView 
            meetings={meetings}
            onJoinMeeting={handleJoinMeeting}
          />
        )}

        {/* TAB: ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <MeetingAnalyticsDashboard 
            meetings={meetings}
          />
        )}

        {/* TAB: ACTIVE CALL VIEW */}
        {activeTab === 'active_call' && activeMeeting && (
          <div className="space-y-6">
            {/* Live Room Controller Banner */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">Live Meeting Active</span>
                    <span className="text-xs text-oat/50">•</span>
                    <span className="text-xs font-mono text-gold">{activeMeeting.meetingCode}</span>
                  </div>
                  <h3 className="text-base font-bold text-oat">{activeMeeting.title}</h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={activeMeeting.meetingUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-vanta font-bold rounded text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  Launch Google Meet Window
                </a>

                <button
                  onClick={() => handleExportPDF(activeMeeting)}
                  className="px-3 py-2 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 rounded text-xs flex items-center gap-1.5 font-bold transition-all shadow"
                  title="Export meeting summary, decisions & tasks to downloadable PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export PDF Report
                </button>

                <button
                  onClick={() => handleCopyLink(activeMeeting.meetingUri, 'active_call_link')}
                  className="px-3 py-2 bg-vanta-light hover:bg-gold/10 text-oat border border-gold/20 rounded text-xs flex items-center gap-1.5 transition-all"
                >
                  {copiedId === 'active_call_link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gold" />}
                  {copiedId === 'active_call_link' ? 'Copied URL' : 'Copy Link'}
                </button>

                <button
                  onClick={() => handleCopyInvitation(activeMeeting)}
                  className="px-3 py-2 bg-vanta-light hover:bg-gold/10 text-oat border border-gold/20 rounded text-xs flex items-center gap-1.5 transition-all"
                >
                  {copiedId === `invite_${activeMeeting.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gold" />}
                  Invite Text
                </button>

                <button
                  onClick={() => handleEndMeeting(activeMeeting)}
                  className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded text-xs flex items-center gap-1.5 transition-all"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  End Call & Log Duration
                </button>
              </div>
            </div>

            {/* Split Screen: Meeting Details & Live Transcription / Action Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Meeting Details & Gemini Task List */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 bg-vanta-light/50 border border-gold/10 rounded-xl space-y-4">
                  <h4 className="text-xs uppercase tracking-wider text-gold font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Meeting Space & Milestone Anchor
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gold/5">
                      <span className="text-oat/60">Space Resource:</span>
                      <span className="text-oat/90 font-mono">{activeMeeting.spaceName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gold/5">
                      <span className="text-oat/60">Milestone Linked:</span>
                      <span className="text-amber-300 font-semibold">{activeMeeting.milestoneTitle || 'General Delivery'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gold/5">
                      <span className="text-oat/60">Engagement Phase:</span>
                      <span className="text-emerald-400 font-semibold">{activeMeeting.meetingPhase || 'General'}</span>
                    </div>
                    {activeMeeting.clientEmail && (
                      <div className="flex justify-between py-1 border-b border-gold/5">
                        <span className="text-oat/60">Client Email:</span>
                        <span className="text-oat/90">{activeMeeting.clientEmail}</span>
                      </div>
                    )}
                    {activeMeeting.agenda && (
                      <div className="pt-2">
                        <span className="text-oat/60 block mb-1">Session Agenda:</span>
                        <p className="p-2.5 bg-vanta/60 rounded border border-gold/10 text-oat/80 text-[11px] leading-relaxed">
                          {activeMeeting.agenda}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Tasks Checklist (Live) */}
                <div className="p-4 bg-vanta-light/50 border border-gold/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-xs uppercase tracking-wider text-gold font-bold flex items-center gap-2">
                      <ListTodo className="w-4 h-4" />
                      Gemini Extracted Action Tasks
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {(activeMeeting.tasks || []).filter(t => t.status === 'DONE').length}/{(activeMeeting.tasks || []).length} Done
                      </span>

                      {(activeMeeting.tasks?.length || 0) > 0 && (
                        <button
                          onClick={() => handleSyncTasksToProject(activeMeeting)}
                          disabled={isSyncingProjectId === activeMeeting.id}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                            syncedFeedbackId === activeMeeting.id || activeMeeting.isSyncedToProject
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                          }`}
                          title="Push action tasks to project board"
                        >
                          {isSyncingProjectId === activeMeeting.id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          ) : syncedFeedbackId === activeMeeting.id || activeMeeting.isSyncedToProject ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <FolderGit2 className="w-2.5 h-2.5 text-gold" />
                          )}
                          {isSyncingProjectId === activeMeeting.id 
                            ? 'Syncing...' 
                            : syncedFeedbackId === activeMeeting.id 
                            ? 'Synced!' 
                            : activeMeeting.isSyncedToProject
                            ? 'Synced to Project'
                            : 'Sync to Project'}
                        </button>
                      )}
                    </div>
                  </div>

                  {(!activeMeeting.tasks || activeMeeting.tasks.length === 0) ? (
                    <div className="p-4 text-center border border-dashed border-gold/10 rounded-lg space-y-2">
                      <Sparkles className="w-5 h-5 text-gold/40 mx-auto" />
                      <p className="text-xs text-oat/60">No tasks extracted yet.</p>
                      <p className="text-[10px] text-oat/40">
                        Take notes or speak into the microphone, then click "Synthesize AI Summary & Tasks".
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {activeMeeting.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id)}
                          className={`p-2 rounded border flex items-start gap-2 cursor-pointer text-xs transition-all ${
                            task.status === 'DONE'
                              ? 'bg-vanta/30 border-emerald-500/20 text-oat/40'
                              : 'bg-vanta/80 border-gold/20 text-oat hover:border-gold/50'
                          }`}
                        >
                          <button className="mt-0.5 text-gold">
                            {task.status === 'DONE' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gold/60" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold ${task.status === 'DONE' ? 'line-through' : ''}`}>
                              {task.title}
                            </p>
                            <p className="text-[10px] text-oat/50">
                              Owner: {task.assignee} · Due: {task.dueDate}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Session Notes, Voice Dictation & AI Summarizer */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                {/* AI & Dictation Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gold/5 border border-gold/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleSpeechRecognition}
                      className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 font-bold transition-all ${
                        isRecordingAudio 
                          ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' 
                          : 'bg-vanta border border-gold/30 text-gold hover:bg-gold/10'
                      }`}
                    >
                      {isRecordingAudio ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                      {isRecordingAudio ? 'Recording Live Audio...' : 'Voice Dictate'}
                    </button>

                    <button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="px-3 py-1.5 bg-vanta hover:bg-gold/10 text-oat border border-gold/30 rounded text-xs flex items-center gap-1.5 transition-all"
                    >
                      {isSavingNotes ? <RefreshCw className="w-3 h-3 animate-spin text-gold" /> : <Check className="w-3 h-3 text-gold" />}
                      {isSavingNotes ? 'Saving...' : 'Save Draft'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {(activeMeeting.tasks?.length || 0) > 0 && (
                      <button
                        onClick={() => handleSyncTasksToProject(activeMeeting)}
                        disabled={isSyncingProjectId === activeMeeting.id}
                        className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 font-bold transition-all shadow ${
                          syncedFeedbackId === activeMeeting.id || activeMeeting.isSyncedToProject
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                        }`}
                        title="Push AI tasks to Project Board"
                      >
                        {isSyncingProjectId === activeMeeting.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : syncedFeedbackId === activeMeeting.id || activeMeeting.isSyncedToProject ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <FolderGit2 className="w-3.5 h-3.5 text-gold" />
                        )}
                        {isSyncingProjectId === activeMeeting.id
                          ? 'Syncing...'
                          : syncedFeedbackId === activeMeeting.id
                          ? 'Synced to Board!'
                          : activeMeeting.isSyncedToProject
                          ? 'Re-Sync Tasks'
                          : 'Sync to Project'}
                      </button>
                    )}

                    <button
                      onClick={() => handleExportPDF(activeMeeting)}
                      className="px-3 py-1.5 bg-vanta hover:bg-gold/10 text-gold border border-gold/30 rounded text-xs flex items-center gap-1.5 font-bold transition-all"
                      title="Download PDF Report"
                    >
                      <Download className="w-3.5 h-3.5 text-gold" />
                      PDF Report
                    </button>

                    <button
                      onClick={handleSynthesizeTasks}
                      disabled={isSummarizing}
                      className="px-4 py-1.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded text-xs flex items-center gap-1.5 shadow disabled:opacity-50"
                    >
                      {isSummarizing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      {isSummarizing ? 'Synthesizing with Gemini...' : 'Synthesize AI Summary & Tasks'}
                    </button>
                  </div>
                </div>

                {/* Live Transcript Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gold font-bold uppercase tracking-wider flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5" />
                      Live Audio Transcript / Discussion Feed
                    </span>
                    <span className="text-[10px] text-oat/50">
                      Speech-to-text or manual paste
                    </span>
                  </div>
                  <textarea
                    value={transcriptDraft}
                    onChange={(e) => setTranscriptDraft(e.target.value)}
                    placeholder="Live spoken discussion is automatically transcribed here when Voice Dictate is active. You can also paste meeting transcripts directly..."
                    className="w-full h-36 p-3 bg-vanta border border-gold/20 rounded-xl text-oat font-mono text-xs focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                {/* Scratchpad Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gold font-bold uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Architectural Scratchpad & Agreed Boundaries
                    </span>
                    <span className="text-[10px] text-oat/50">
                      Synched with Firebase Firestore
                    </span>
                  </div>
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Record key architectural decisions, boundary constraints, test vectors, or agreed client sign-offs..."
                    className="w-full h-44 p-3 bg-vanta border border-gold/20 rounded-xl text-oat font-mono text-xs focus:outline-none focus:border-gold resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Real-time Meeting Sentiment Gauge & Live AI Board Interventions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Real-time Emotional Tone Gauge */}
              <div className="lg:col-span-5">
                <LiveSentimentGauge
                  meetingTitle={activeMeeting.title}
                  transcript={transcriptDraft || activeMeeting.transcript || ''}
                  notes={notesDraft || activeMeeting.notes || ''}
                  agenda={activeMeeting.agenda}
                  meetingPhase={activeMeeting.meetingPhase}
                  onSentimentUpdated={(s) => setLiveSentiment(s)}
                />
              </div>

              {/* Live Spoken Voice AI Board Feed & Direct Inquiries */}
              <div className="lg:col-span-7">
                <InMeetingAgentFeed
                  meeting={activeMeeting}
                  personas={personas}
                  interventions={interventions}
                  onAddIntervention={(newIntervention) => setInterventions(prev => [newIntervention, ...prev])}
                  transcript={transcriptDraft}
                  notes={notesDraft}
                  activeSpeakingId={activeSpeakingId}
                  setActiveSpeakingId={setActiveSpeakingId}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB: SCHEDULE FORM */}
        {activeTab === 'schedule' && (
          <div className="max-w-2xl mx-auto p-6 bg-vanta-light/50 border border-gold/20 rounded-xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-oat flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gold" />
                Schedule Client Google Meet & Calendar Sync
              </h3>
              <p className="text-xs text-oat/60 mt-1">
                Creates a persistent Google Meet space, creates Google Calendar events, and anchors meeting outcomes to project milestones.
              </p>
            </div>

            <form onSubmit={handleScheduleMeeting} className="space-y-4">
              <div>
                <label className="text-xs text-oat/80 block mb-1 font-semibold">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Apex Health - Phase 1 Scoping Session"
                  className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Client / Attendee Name</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Client Email Address (for Calendar Invite)</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    placeholder="e.g. client@company.com"
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Project Milestone Link</label>
                  <select
                    value={formData.milestoneTitle}
                    onChange={(e) => setFormData({ ...formData, milestoneTitle: e.target.value })}
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="Milestone 1: Acceptance Contract Sign-Off">Milestone 1: Acceptance Contract Sign-Off</option>
                    <option value="Milestone 2: Reconciler Engine Build & Staged Evidence">Milestone 2: Reconciler Engine Build & Staged Evidence</option>
                    <option value="Milestone 3: Acceptance Overseer Verification Release">Milestone 3: Acceptance Overseer Verification Release</option>
                    <option value="Milestone 4: Production Deployment & Hand-Off">Milestone 4: Production Deployment & Hand-Off</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Engagement Phase</label>
                  <select
                    value={formData.meetingPhase}
                    onChange={(e: any) => setFormData({ ...formData, meetingPhase: e.target.value })}
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="phase1-discovery">Phase 1: Discovery / Intake</option>
                    <option value="phase2-sprint">Phase 2: Sprint Review</option>
                    <option value="phase3-verify">Phase 3: Verify & Acceptance</option>
                    <option value="general">General Client Call</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Time</label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="text-xs text-oat/80 block mb-1 font-semibold">Duration</label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value, 10) })}
                    className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-oat/80 block mb-1 font-semibold">Access Security Policy</label>
                <div className="grid grid-cols-3 gap-3">
                  <label className={`p-3 rounded border text-xs cursor-pointer flex flex-col items-center gap-1 text-center ${formData.accessType === 'OPEN' ? 'bg-gold/10 border-gold text-gold' : 'bg-vanta border-gold/10 text-oat/60'}`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formData.accessType === 'OPEN'}
                      onChange={() => setFormData({ ...formData, accessType: 'OPEN' })}
                      className="hidden"
                    />
                    <Globe className="w-4 h-4" />
                    <span className="font-bold">OPEN</span>
                    <span className="text-[10px] text-oat/50">Anyone with link can join</span>
                  </label>

                  <label className={`p-3 rounded border text-xs cursor-pointer flex flex-col items-center gap-1 text-center ${formData.accessType === 'TRUSTED' ? 'bg-gold/10 border-gold text-gold' : 'bg-vanta border-gold/10 text-oat/60'}`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formData.accessType === 'TRUSTED'}
                      onChange={() => setFormData({ ...formData, accessType: 'TRUSTED' })}
                      className="hidden"
                    />
                    <Users className="w-4 h-4" />
                    <span className="font-bold">TRUSTED</span>
                    <span className="text-[10px] text-oat/50">Invited users only</span>
                  </label>

                  <label className={`p-3 rounded border text-xs cursor-pointer flex flex-col items-center gap-1 text-center ${formData.accessType === 'RESTRICTED' ? 'bg-gold/10 border-gold text-gold' : 'bg-vanta border-gold/10 text-oat/60'}`}>
                    <input
                      type="radio"
                      name="accessType"
                      checked={formData.accessType === 'RESTRICTED'}
                      onChange={() => setFormData({ ...formData, accessType: 'RESTRICTED' })}
                      className="hidden"
                    />
                    <Lock className="w-4 h-4" />
                    <span className="font-bold">RESTRICTED</span>
                    <span className="text-[10px] text-oat/50">Host admit required</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-oat/80 block mb-1 font-semibold">Agenda & Key Discussion Topics</label>
                <textarea
                  value={formData.agenda}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 bg-vanta border border-gold/20 rounded text-xs text-oat focus:outline-none focus:border-gold resize-none"
                />
              </div>

              {/* Google Calendar Sync Checkbox */}
              <div className="p-3 bg-vanta border border-gold/20 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  <div>
                    <span className="text-xs font-bold text-oat">Sync to Google Calendar</span>
                    <p className="text-[10px] text-oat/50">Auto-create Google Calendar event with Meet link attached</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={formData.syncToGoogleCalendar}
                  onChange={(e) => setFormData({ ...formData, syncToGoogleCalendar: e.target.checked })}
                  className="w-4 h-4 accent-gold cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('hub')}
                  className="px-4 py-2 bg-vanta hover:bg-white/5 text-oat/70 rounded text-xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-gold hover:bg-gold/90 text-vanta font-bold rounded text-xs flex items-center gap-2 shadow-lg shadow-gold/10 disabled:opacity-50"
                >
                  {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {isCreating ? 'Provisioning Google Meet...' : 'Confirm & Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: HUB OVERVIEW */}
        {activeTab === 'hub' && (
          <div className="space-y-6">
            {/* Quick Action Feature Banners */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div 
                onClick={handleCreateInstantMeeting}
                className="p-4 bg-gradient-to-br from-gold/10 via-vanta-light to-vanta border border-gold/30 rounded-xl hover:border-gold/60 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-gold/20 text-gold group-hover:scale-110 transition-transform">
                    <Video className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-gold font-bold uppercase tracking-wider">Instant</span>
                </div>
                <h4 className="text-sm font-bold text-oat group-hover:text-gold transition-colors">Start Instant Meeting</h4>
                <p className="text-[11px] text-oat/60 mt-1">Spin up a Google Meet space in 1 second and invite clients.</p>
              </div>

              <div 
                onClick={() => setActiveTab('schedule')}
                className="p-4 bg-vanta-light/60 border border-gold/20 rounded-xl hover:border-gold/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">G-Cal Sync</span>
                </div>
                <h4 className="text-sm font-bold text-oat group-hover:text-gold transition-colors">Book Strategy Session</h4>
                <p className="text-[11px] text-oat/60 mt-1">Set date, time, milestone anchor, and calendar invites.</p>
              </div>

              <div 
                onClick={() => setActiveTab('timeline')}
                className="p-4 bg-vanta-light/60 border border-gold/20 rounded-xl hover:border-gold/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Layers className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Artifacts</span>
                </div>
                <h4 className="text-sm font-bold text-oat group-hover:text-gold transition-colors">Project Timeline</h4>
                <p className="text-[11px] text-oat/60 mt-1">Inspect historical meetings, linked SOWs, and AC verification notes.</p>
              </div>

              <div 
                onClick={() => setActiveTab('analytics')}
                className="p-4 bg-vanta-light/60 border border-gold/20 rounded-xl hover:border-gold/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="p-2 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">D3 Metrics</span>
                </div>
                <h4 className="text-sm font-bold text-oat group-hover:text-gold transition-colors">Meeting Velocity</h4>
                <p className="text-[11px] text-oat/60 mt-1">Interactive frequency and duration analytics per client.</p>
              </div>
            </div>

            {/* Strategic AI Voice Specialists Attending Board Card */}
            <div className="p-5 bg-vanta-light/40 border border-gold/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-gold font-bold flex items-center gap-2">
                      Strategic AI Voice Attendee Board
                      <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-normal">
                        {personas.filter(p => p.isAttending).length} Active Attendees
                      </span>
                    </h3>
                    <p className="text-[11px] text-oat/60">
                      Autonomous AI specialists attending calls to guide technical architecture, Law 9 verification, and commercial SOW safeguards.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPersonaModalOpen(true)}
                  className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 rounded text-xs flex items-center gap-1.5 font-bold transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  Configure Personas & Voices
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-1">
                {personas.map((persona) => (
                  <div
                    key={persona.id}
                    onClick={() => setIsPersonaModalOpen(true)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      persona.isAttending
                        ? 'bg-vanta/80 border-gold/30 hover:border-gold shadow-md'
                        : 'bg-vanta/40 border-gold/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={persona.avatarUrl}
                        alt={persona.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border border-gold/30"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-oat truncate">{persona.name}</h4>
                        <p className="text-[10px] text-oat/50 truncate">{persona.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] pt-1 border-t border-gold/10">
                      <span className="text-gold font-bold uppercase">{persona.communicationStyle}</span>
                      <span className={persona.isAttending ? 'text-emerald-400 font-bold' : 'text-oat/40'}>
                        {persona.isAttending ? 'Attending' : 'Standby'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Live Meetings Highlight (if any) */}
            {activeLiveMeetings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                    Active Live Conferences ({activeLiveMeetings.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeLiveMeetings.map(meeting => (
                    <div 
                      key={meeting.id}
                      className="p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-xl space-y-3 shadow-lg shadow-emerald-950/40"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-bold uppercase">
                              LIVE NOW
                            </span>
                            <span className="text-xs font-mono text-oat/70">{meeting.meetingCode}</span>
                          </div>
                          <h4 className="text-sm font-bold text-oat mt-1">{meeting.title}</h4>
                        </div>

                        <button
                          onClick={(e) => handleDelete(meeting.id, e)}
                          className="text-oat/40 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-oat/70 line-clamp-2">{meeting.agenda}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExportPDF(meeting)}
                            className="p-1.5 bg-vanta/60 hover:bg-gold/10 text-gold border border-gold/20 rounded text-xs flex items-center gap-1"
                            title="Export PDF Report"
                          >
                            <Download className="w-3.5 h-3.5 text-gold" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(meeting.meetingUri, meeting.id)}
                            className="p-1.5 bg-vanta/60 hover:bg-gold/10 text-oat/80 border border-gold/10 rounded text-xs flex items-center gap-1"
                            title="Copy Meeting URL"
                          >
                            {copiedId === meeting.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gold" />}
                          </button>
                          <button
                            onClick={() => handleCopyInvitation(meeting)}
                            className="p-1.5 bg-vanta/60 hover:bg-gold/10 text-oat/80 border border-gold/10 rounded text-xs flex items-center gap-1"
                            title="Copy Full Invitation"
                          >
                            {copiedId === `invite_${meeting.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gold" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleJoinMeeting(meeting)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-vanta font-bold rounded text-xs flex items-center gap-1.5 shadow"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Join Call
                          </button>
                          <button
                            onClick={() => handleEndMeeting(meeting)}
                            className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded text-xs"
                          >
                            End
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Search & Multi-Filter Control Console */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keywords across titles, notes, AI summaries, decisions, and tasks..."
                    className="w-full pl-9 pr-8 py-2.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold placeholder:text-oat/40 shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-oat/40 hover:text-oat p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns Grid */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Phase Filter */}
                  <select
                    value={phaseFilter}
                    onChange={(e) => setPhaseFilter(e.target.value)}
                    className="px-2.5 py-2 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="all">All Phases</option>
                    <option value="phase1-discovery">Phase 1: Discovery</option>
                    <option value="phase2-sprint">Phase 2: Sprint Review</option>
                    <option value="phase3-verify">Phase 3: Verification</option>
                    <option value="general">General</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-2 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="all">All Statuses</option>
                    <option value="live">Live Now</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="ended">Ended / Past</option>
                  </select>

                  {/* Project Sync Filter */}
                  <select
                    value={syncFilter}
                    onChange={(e) => setSyncFilter(e.target.value)}
                    className="px-2.5 py-2 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="all">All Sync States</option>
                    <option value="synced">Synced to Project</option>
                    <option value="unsynced">Unsynced Action Items</option>
                  </select>

                  {/* Tasks Filter */}
                  <select
                    value={hasTasksFilter}
                    onChange={(e) => setHasTasksFilter(e.target.value)}
                    className="px-2.5 py-2 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                  >
                    <option value="all">All Task States</option>
                    <option value="with_tasks">Has AI Tasks</option>
                    <option value="no_tasks">No Tasks</option>
                  </select>
                </div>
              </div>

              {/* Quick Filter Chips & Results Count */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-oat/50 flex items-center gap-1 mr-1">
                    <Filter className="w-3 h-3 text-gold/70" />
                    Quick:
                  </span>
                  
                  <button
                    onClick={() => {
                      setPhaseFilter(phaseFilter === 'phase1-discovery' ? 'all' : 'phase1-discovery');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      phaseFilter === 'phase1-discovery'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-vanta/60 text-oat/60 border-gold/10 hover:border-gold/30'
                    }`}
                  >
                    Phase 1 Discovery
                  </button>

                  <button
                    onClick={() => {
                      setHasTasksFilter(hasTasksFilter === 'with_tasks' ? 'all' : 'with_tasks');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      hasTasksFilter === 'with_tasks'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-vanta/60 text-oat/60 border-gold/10 hover:border-gold/30'
                    }`}
                  >
                    Has Action Items
                  </button>

                  <button
                    onClick={() => {
                      setSyncFilter(syncFilter === 'synced' ? 'all' : 'synced');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      syncFilter === 'synced'
                        ? 'bg-gold/20 text-gold border-gold/40'
                        : 'bg-vanta/60 text-oat/60 border-gold/10 hover:border-gold/30'
                    }`}
                  >
                    Synced to Project
                  </button>

                  <button
                    onClick={() => {
                      setStatusFilter(statusFilter === 'live' ? 'all' : 'live');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                      statusFilter === 'live'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-vanta/60 text-oat/60 border-gold/10 hover:border-gold/30'
                    }`}
                  >
                    Live Conferences
                  </button>

                  {(searchQuery || phaseFilter !== 'all' || statusFilter !== 'all' || syncFilter !== 'all' || hasTasksFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPhaseFilter('all');
                        setStatusFilter('all');
                        setSyncFilter('all');
                        setHasTasksFilter('all');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] text-rose-300 hover:text-rose-200 bg-rose-950/30 border border-rose-500/20 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Reset All
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-oat/50">
                  Showing <strong className="text-gold">{filteredMeetings.length}</strong> of {meetings.length} sessions
                </span>
              </div>
            </div>

            {/* Meetings Table / List */}
            <div className="bg-vanta-light/40 border border-gold/20 rounded-xl overflow-hidden shadow-lg">
              <div className="p-3 bg-vanta border-b border-gold/10 text-xs font-bold text-gold uppercase tracking-wider flex justify-between items-center">
                <span>Client Sessions, Gemini Summaries & Action Items ({filteredMeetings.length})</span>
                <span className="text-[10px] text-oat/50 lowercase">synced to firestore</span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-oat/50 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-gold" />
                  Loading meeting spaces...
                </div>
              ) : filteredMeetings.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Video className="w-8 h-8 text-gold/30 mx-auto" />
                  <p className="text-xs text-oat/60">No Google Meet sessions found matching query or filters.</p>
                  <button
                    onClick={handleCreateInstantMeeting}
                    className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Start First Meeting
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gold/10">
                  {filteredMeetings.map((meeting) => {
                    const taskCount = meeting.tasks?.length || 0;
                    const doneCount = meeting.tasks?.filter(t => t.status === 'DONE').length || 0;

                    return (
                      <div 
                        key={meeting.id}
                        className="p-4 hover:bg-gold/5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                      >
                        <div 
                          className="space-y-1.5 flex-1 cursor-pointer"
                          onClick={() => handleOpenInspector(meeting)}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase ${
                              meeting.status === 'live' 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : meeting.status === 'scheduled'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {meeting.status}
                            </span>

                            <span className="px-2 py-0.5 bg-gold/10 text-gold text-[10px] rounded border border-gold/20">
                              {meeting.meetingPhase || 'General'}
                            </span>

                            <span className="text-xs font-mono text-oat/50">{meeting.meetingCode}</span>

                            {meeting.summary && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-purple-300" />
                                AI Summarized
                              </span>
                            )}

                            {meeting.isSyncedToProject && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1">
                                <FolderGit2 className="w-2.5 h-2.5 text-emerald-400" />
                                Synced to Board
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-bold text-oat flex items-center gap-2 hover:text-gold transition-colors">
                            {meeting.title}
                            <ArrowUpRight className="w-3.5 h-3.5 text-gold/50 opacity-0 group-hover:opacity-100" />
                          </h4>

                          {meeting.summary?.executiveSummary && (
                            <p className="text-xs text-oat/70 line-clamp-2 italic">
                              "{meeting.summary.executiveSummary}"
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-oat/60 flex-wrap pt-0.5">
                            {meeting.scheduledTime && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock className="w-3 h-3 text-gold" />
                                {new Date(meeting.scheduledTime).toLocaleString()}
                              </span>
                            )}
                            {meeting.clientEmail && (
                              <span className="text-[11px] text-oat/70">
                                Client: {meeting.clientName || meeting.clientEmail}
                              </span>
                            )}
                            {meeting.milestoneTitle && (
                              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                {meeting.milestoneTitle}
                              </span>
                            )}
                            {taskCount > 0 && (
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                <ListTodo className="w-3 h-3" />
                                {doneCount}/{taskCount} Action Tasks
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Sync to Project Quick Button */}
                          {taskCount > 0 && (
                            <button
                              onClick={() => handleSyncTasksToProject(meeting)}
                              disabled={isSyncingProjectId === meeting.id}
                              className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1 font-bold transition-all shadow ${
                                syncedFeedbackId === meeting.id || meeting.isSyncedToProject
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                              }`}
                              title="Push extracted action items to project board"
                            >
                              {isSyncingProjectId === meeting.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : syncedFeedbackId === meeting.id || meeting.isSyncedToProject ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <FolderGit2 className="w-3.5 h-3.5 text-gold" />
                              )}
                              <span className="hidden sm:inline">
                                {isSyncingProjectId === meeting.id
                                  ? 'Syncing...'
                                  : syncedFeedbackId === meeting.id
                                  ? 'Synced!'
                                  : meeting.isSyncedToProject
                                  ? 'Re-Sync'
                                  : 'Sync'}
                              </span>
                            </button>
                          )}

                          {/* Inspect & Summary Button */}
                          <button
                            onClick={() => handleOpenInspector(meeting)}
                            className="p-2 bg-vanta hover:bg-gold/10 text-oat border border-gold/20 rounded text-xs flex items-center gap-1"
                            title="Inspect Meeting AI Intelligence, Summary & Tasks"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-gold" />
                            <span className="hidden sm:inline text-[11px]">Insights</span>
                          </button>

                          {/* PDF Report Export */}
                          <button
                            onClick={(e) => handleExportPDF(meeting, e)}
                            className="p-2 bg-vanta hover:bg-gold/10 text-gold border border-gold/30 rounded text-xs flex items-center gap-1 font-bold"
                            title="Download PDF Report"
                          >
                            <Download className="w-3.5 h-3.5 text-gold" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>

                          {/* Google Calendar Sync */}
                          <button
                            onClick={() => handleDirectCalendarSync(meeting)}
                            className="p-2 bg-vanta hover:bg-gold/10 text-oat/80 border border-gold/20 rounded text-xs flex items-center gap-1"
                            title="Add to Google Calendar"
                          >
                            <Calendar className="w-3.5 h-3.5 text-gold" />
                            <span className="hidden sm:inline">G-Cal</span>
                          </button>

                          <button
                            onClick={() => handleCopyLink(meeting.meetingUri, meeting.id)}
                            className="px-2.5 py-1.5 bg-vanta hover:bg-gold/10 text-oat border border-gold/20 rounded text-xs flex items-center gap-1"
                            title="Copy Link"
                          >
                            {copiedId === meeting.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gold" />}
                            <span className="hidden sm:inline">Link</span>
                          </button>

                          <button
                            onClick={() => handleJoinMeeting(meeting)}
                            className="px-3.5 py-1.5 bg-gold hover:bg-gold/90 text-vanta font-bold rounded text-xs flex items-center gap-1.5 shadow"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {meeting.status === 'live' ? 'Join' : 'Launch'}
                          </button>

                          <button
                            onClick={(e) => handleDelete(meeting.id, e)}
                            className="p-1.5 text-oat/30 hover:text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Meeting Intelligence, AI Summary & Task Inspector Modal */}
      {inspectingMeeting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-vanta border border-gold/40 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-oat">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-vanta-light/90 border-b border-gold/20 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] bg-gold/10 text-gold border border-gold/20 rounded font-bold uppercase">
                    {inspectingMeeting.meetingPhase || 'General'}
                  </span>
                  <span className="text-xs text-oat/50 font-mono">{inspectingMeeting.meetingCode}</span>
                </div>
                <h3 className="text-base font-bold text-oat">{inspectingMeeting.title}</h3>
              </div>

              <button
                onClick={() => setInspectingMeeting(null)}
                className="p-2 text-oat/50 hover:text-oat rounded-lg hover:bg-gold/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gold/5 border border-gold/20 rounded-xl">
                <div className="flex items-center gap-2">
                  {/* Sync to Project Button */}
                  <button
                    onClick={() => handleSyncTasksToProject(inspectingMeeting)}
                    disabled={isSyncingProjectId === inspectingMeeting.id || inspectingMeetingDraftTasks.length === 0}
                    className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow ${
                      syncedFeedbackId === inspectingMeeting.id || inspectingMeeting.isSyncedToProject
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                    } disabled:opacity-50`}
                  >
                    {isSyncingProjectId === inspectingMeeting.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : syncedFeedbackId === inspectingMeeting.id || inspectingMeeting.isSyncedToProject ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <FolderGit2 className="w-3.5 h-3.5 text-gold" />
                    )}
                    {isSyncingProjectId === inspectingMeeting.id
                      ? 'Syncing to Project...'
                      : syncedFeedbackId === inspectingMeeting.id
                      ? 'Synced to Project Board!'
                      : inspectingMeeting.isSyncedToProject
                      ? 'Re-Sync to Project'
                      : 'Sync to Project Board'}
                  </button>

                  <button
                    onClick={() => exportMeetingToPDF(inspectingMeeting)}
                    className="px-3 py-1.5 bg-vanta hover:bg-gold/10 text-gold border border-gold/30 rounded text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Report
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunInspectorSummary(inspectingMeeting)}
                    disabled={isSummarizing}
                    className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 rounded text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSummarizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isSummarizing ? 'Synthesizing...' : 'Re-Synthesize with Gemini'}
                  </button>

                  <button
                    onClick={() => handleJoinMeeting(inspectingMeeting)}
                    className="px-3.5 py-1.5 bg-gold text-vanta font-bold rounded text-xs flex items-center gap-1.5 shadow hover:bg-gold/90"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch Call
                  </button>
                </div>
              </div>

              {/* Gemini Executive Summary */}
              {inspectingMeeting.summary ? (
                <div className="space-y-4">
                  <div className="p-4 bg-vanta-light/40 border border-gold/20 rounded-xl space-y-3">
                    <h4 className="text-xs uppercase font-bold text-gold tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-gold" />
                      Gemini Executive Call Summary
                    </h4>
                    <p className="text-xs text-oat/90 leading-relaxed">
                      {inspectingMeeting.summary.executiveSummary}
                    </p>

                    {inspectingMeeting.summary.keyDecisions?.length > 0 && (
                      <div className="pt-2 border-t border-gold/10">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          Key Decisions Agreed:
                        </span>
                        <ul className="list-disc list-inside text-xs text-oat/80 space-y-1">
                          {inspectingMeeting.summary.keyDecisions.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {inspectingMeeting.summary.blockersAndRisks?.length > 0 && (
                      <div className="pt-2 border-t border-gold/10">
                        <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                          Identified Risks & Blockers:
                        </span>
                        <ul className="list-disc list-inside text-xs text-rose-300/90 space-y-1">
                          {inspectingMeeting.summary.blockersAndRisks.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-gold/20 rounded-xl space-y-3 bg-vanta-light/20">
                  <Sparkles className="w-8 h-8 text-gold/40 mx-auto" />
                  <h4 className="text-sm font-bold text-oat">No Gemini AI Summary Generated Yet</h4>
                  <p className="text-xs text-oat/60 max-w-md mx-auto">
                    Click "Re-Synthesize with Gemini" above to automatically analyze conference notes and generate executive summaries with action items.
                  </p>
                  <button
                    onClick={() => handleRunInspectorSummary(inspectingMeeting)}
                    disabled={isSummarizing}
                    className="px-4 py-2 bg-gold hover:bg-gold/90 text-vanta font-bold rounded-lg text-xs inline-flex items-center gap-1.5 shadow"
                  >
                    <Sparkles className="w-4 h-4" />
                    Synthesize Summary Now
                  </button>
                </div>
              )}

              {/* Actionable Project Tasks Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold text-oat flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-gold" />
                    Actionable Tasks Checklist ({inspectingMeetingDraftTasks.length})
                  </h4>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    {inspectingMeetingDraftTasks.filter(t => t.status === 'DONE').length}/{inspectingMeetingDraftTasks.length} Completed
                  </span>
                </div>

                {inspectingMeetingDraftTasks.length === 0 ? (
                  <p className="text-xs text-oat/50 italic p-4 bg-vanta-light/20 border border-gold/10 rounded-xl text-center">
                    No actionable tasks extracted for this session.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inspectingMeetingDraftTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleToggleInspectorTask(task.id)}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                          task.status === 'DONE'
                            ? 'bg-vanta/30 border-emerald-500/20 text-oat/40'
                            : 'bg-vanta-light/50 border-gold/20 hover:border-gold/50 text-oat'
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

                          <p className="text-[11px] text-oat/70 mt-1">
                            {task.description}
                          </p>

                          <div className="flex items-center gap-3 text-[10px] text-oat/50 mt-1.5 flex-wrap">
                            <span>Assignee: <strong className="text-oat/80">{task.assignee}</strong></span>
                            <span>Due: <strong className="text-oat/80">{task.dueDate}</strong></span>
                            {task.verificationCriteria && (
                              <span>Criteria: <strong className="text-emerald-400/80">{task.verificationCriteria}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recorded Scratchpad Notes */}
              {inspectingMeeting.notes && (
                <div className="p-3.5 bg-vanta-light/20 rounded-xl border border-gold/10 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gold tracking-wider">
                    Recorded Conference Scratchpad Notes
                  </span>
                  <p className="text-xs text-oat/80 whitespace-pre-wrap font-mono">
                    {inspectingMeeting.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-vanta-light/90 border-t border-gold/20 flex items-center justify-end gap-3">
              <button
                onClick={() => setInspectingMeeting(null)}
                className="px-4 py-2 bg-vanta hover:bg-gold/10 text-oat border border-gold/20 rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Autonomous AI Voice Personas Management Modal */}
      {isPersonaModalOpen && (
        <PersonaSelectorModal
          personas={personas}
          onUpdatePersonas={handleUpdatePersonas}
          onClose={() => setIsPersonaModalOpen(false)}
        />
      )}
    </div>
  );
};
