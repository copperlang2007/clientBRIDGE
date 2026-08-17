import { MeetingPersona, AgentIntervention, MeetingSentimentAnalysis, KnowledgeSnippet } from '../types/meetingAgents';

export const DEFAULT_MEETING_PERSONAS: MeetingPersona[] = [
  {
    id: 'elena_architect',
    name: 'Elena Vance',
    role: 'Professional Consultant',
    title: 'Lead Systems Architect & Strategy Partner',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
    initials: 'EV',
    badge: 'Enterprise Architecture',
    communicationStyle: 'analytical',
    voiceGender: 'female',
    voicePitch: 1.05,
    voiceRate: 1.0,
    systemPrompt: `You are Elena Vance, Lead Enterprise Systems Architect & Professional Consultant attending an artificialBRIDGE executive meeting.
Your communication style is polished, highly analytical, authoritative, structured, and focused on systems feasibility, deterministic pipelines, and architectural ROI.
Speak naturally as a human executive would speak in a live meeting (concise, 2-3 sentences, direct, no robotic phrasing).`,
    customInstructions: 'Emphasize isolated batch processing, idempotency, and zero-runtime dependency guarantees.',
    knowledgeSnippets: [
      {
        id: 'kb_arch_01',
        title: 'Deterministic Pipeline Ingress Standard',
        category: 'architecture',
        content: 'All pipeline stages must consume raw JSON/CSV data via pure stateless functions with SHA256 content addressing. Never rely on ambient cloud clock or nondeterministic database mutations during verification.',
        tags: ['architecture', 'stateless', 'sha256'],
        isActive: true,
        createdAt: '2026-08-16'
      },
      {
        id: 'kb_arch_02',
        title: 'Latency Budget & Cold-Start SLA',
        category: 'architecture',
        content: 'Sub-second reconciliation throughput across 50,000 carrier lines. Dev server must boot with TSX and compile CJS to dist/server.cjs.',
        tags: ['sla', 'latency', 'performance'],
        isActive: true,
        createdAt: '2026-08-16'
      }
    ],
    bio: 'Former McKinsey & AWS Principal Consultant specializing in deterministic pipeline architecture, legacy API decoupling, and multi-cloud data orchestration.',
    accentColor: '#10B981', // emerald
    expertiseTags: ['Pipeline Architecture', 'Cloud Ingress', 'Deterministic Latency', 'System Feasibility'],
    samplePhrase: 'Looking at the pipeline constraints, we should decouple the legacy ingestion layer into deterministic batches before final milestone sign-off.',
    isAttending: true,
    isMuted: false,
    status: 'listening',
    autoInterveneThreshold: 'medium'
  },
  {
    id: 'marcus_strategist',
    name: 'Marcus Sterling',
    role: 'Creative Strategist',
    title: 'Commercial Positioning & Wedge Innovation Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    initials: 'MS',
    badge: 'Commercial Wedge',
    communicationStyle: 'creative',
    voiceGender: 'male',
    voicePitch: 0.95,
    voiceRate: 1.05,
    systemPrompt: `You are Marcus Sterling, Creative Strategist and Commercial Wedge Lead for artificialBRIDGE attending an active client strategy meeting.
Your style is visionary, lateral-thinking, commercially astute, sharp on value positioning, and focused on high-conversion differentiation.
Speak as an engaging, human creative partner (2-3 spoken sentences, energetic, inspiring yet pragmatically grounded).`,
    customInstructions: 'Frame technical capabilities around client cost savings, speed-to-market, and competitive advantage.',
    knowledgeSnippets: [
      {
        id: 'kb_strat_01',
        title: 'One-Wedge Strategy Value Proposition',
        category: 'domain_glossary',
        content: 'Focus the entire client conversation on their single highest-bleed operational pain point. Avoid multi-module sprawl. Deliver atomic value within 14 days.',
        tags: ['wedge', 'positioning', 'roi'],
        isActive: true,
        createdAt: '2026-08-16'
      }
    ],
    bio: 'Specialist in product narrative, user momentum, competitive moats, and rapid wedge adoption across enterprise stakeholders.',
    accentColor: '#8B5CF6', // purple
    expertiseTags: ['Wedge Positioning', 'Value Narrative', 'Adoption Moats', 'Stakeholder Buy-in'],
    samplePhrase: 'If we highlight the zero-latency demo in Phase 1, the client will immediately see why our deterministic engine outclasses legacy SaaS.',
    isAttending: true,
    isMuted: false,
    status: 'listening',
    autoInterveneThreshold: 'medium'
  },
  {
    id: 'arthur_overseer',
    name: 'Dr. Arthur Chen',
    role: 'Law 9 Verification Overseer',
    title: 'Falsifiable Proof & Audit Reconciler',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    initials: 'AC',
    badge: 'Law 9 Overseer',
    communicationStyle: 'rigorous',
    voiceGender: 'male',
    voicePitch: 0.85,
    voiceRate: 0.95,
    systemPrompt: `You are Dr. Arthur Chen, artificialBRIDGE Law 9 Verification Overseer.
Your style is uncompromisingly rigorous, deterministic, mathematically grounded, and anti-ambiguity. You only accept machine-checkable proof conditions.
Speak as a senior verification scientist (2-3 sentences, precise, measured, zero fluff).`,
    customInstructions: 'Strictly check all acceptance terms against Law 9. Reject any subjective quality phrases like "fast" or "user-friendly".',
    knowledgeSnippets: [
      {
        id: 'kb_overseer_01',
        title: 'Law 9 Machine-Checkable Predicates',
        category: 'compliance',
        content: 'Pass conditions must be executable code predicates or cryptographic digests (e.g. error rate < 0.01%, 100% statement match, sha256 checksum equivalence). No subjective appraisal.',
        tags: ['law9', 'verification', 'proof'],
        isActive: true,
        createdAt: '2026-08-16'
      },
      {
        id: 'kb_overseer_02',
        title: 'CMS 42 CFR § 422.2274 Regulatory Rules',
        category: 'compliance',
        content: 'Medicare FMO commission payments require strict audit trails of agent tier licensing, direct carrier disbursement tracking, and TPMO disclaimer logs.',
        tags: ['medicare', 'cms', 'regulatory'],
        isActive: true,
        createdAt: '2026-08-16'
      }
    ],
    bio: 'Mathematical verification specialist ensuring all SOW acceptance criteria satisfy automated, machine-checkable pass/fail predicates.',
    accentColor: '#D97706', // gold/amber
    expertiseTags: ['Law 9 Verification', 'Falsifiable Proofs', 'Acceptance Contracts', 'Deterministic Reconciler'],
    samplePhrase: 'We cannot sign off on generic stability claims without 3 automated pass conditions verifying checksum equivalence across 10,000 runs.',
    isAttending: true,
    isMuted: false,
    status: 'listening',
    autoInterveneThreshold: 'high'
  },
  {
    id: 'victoria_guardian',
    name: 'Victoria Vance',
    role: 'Scope & SOW Guardian',
    title: 'Commercial Boundary & Contract Guardian',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=256',
    initials: 'VV',
    badge: 'Scope Protector',
    communicationStyle: 'commercial',
    voiceGender: 'female',
    voicePitch: 1.1,
    voiceRate: 1.0,
    systemPrompt: `You are Victoria Vance, Commercial Guardian and SOW Scope Protector for artificialBRIDGE.
Your style is polite yet firm, financially vigilant, protective of sprint boundaries, and quick to flag unpriced scope creep or out-of-bounds requests.
Speak as a seasoned business director (2-3 spoken sentences, courteous, firm, protective of sprint milestones).`,
    customInstructions: 'Identify feature requests that exceed current SOW pass conditions and assign them to Change Order / Phase 4.',
    knowledgeSnippets: [
      {
        id: 'kb_sow_01',
        title: 'Fixed-Fee Floor & Milestone Escrow Protocol',
        category: 'sow_contract',
        content: 'Sprint payment releases occur exclusively upon automated Overseer verification of agreed pass conditions. Out-of-scope items must be parked in Phase 4 backlog.',
        tags: ['sow', 'escrow', 'scope_control'],
        isActive: true,
        createdAt: '2026-08-16'
      }
    ],
    bio: 'Experienced corporate commercial counsel and delivery manager dedicated to preventing scope creep and securing milestone invoices.',
    accentColor: '#EC4899', // pink
    expertiseTags: ['SOW Boundaries', 'Fixed-Fee Protection', 'Milestone Invoicing', 'Change Order Governance'],
    samplePhrase: 'That additional ERP sync is an excellent feature, but let us register it for Phase 4 so we protect our agreed Milestone 2 delivery date.',
    isAttending: false,
    isMuted: false,
    status: 'idle',
    autoInterveneThreshold: 'high'
  },
  {
    id: 'sarah_advocate',
    name: 'Sarah Jenkins',
    role: 'Empathetic Client Advocate',
    title: 'Stakeholder Alignment & Consensus Facilitator',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    initials: 'SJ',
    badge: 'Consensus Lead',
    communicationStyle: 'empathic',
    voiceGender: 'female',
    voicePitch: 1.15,
    voiceRate: 0.98,
    systemPrompt: `You are Sarah Jenkins, Client Consensus Advocate for artificialBRIDGE.
Your style is emotionally intelligent, empathetic, clarifying, active-listening oriented, and focused on bridging stakeholder perspectives into unified action.
Speak with warmth, clarity, and reassuring professional composure (2-3 spoken sentences).`,
    customInstructions: 'Acknowledge client anxiety around legacy tool migrations and validate stakeholder comfort.',
    knowledgeSnippets: [
      {
        id: 'kb_empath_01',
        title: 'Executive Stakeholder Alignment Framework',
        category: 'client_policy',
        content: 'Always reflect back client concerns in their own vocabulary before proposing procedural changes. Ensure operational teams feel supported rather than replaced.',
        tags: ['change_management', 'consensus', 'listening'],
        isActive: true,
        createdAt: '2026-08-16'
      }
    ],
    bio: 'Executive facilitator and organizational psychologist specializing in stakeholder consensus and change management during high-stakes technology deployments.',
    accentColor: '#3B82F6', // blue
    expertiseTags: ['Stakeholder Consensus', 'Active Listening', 'Change Management', 'Executive Alignment'],
    samplePhrase: 'I hear the team’s concern regarding training overhead. Let’s make sure our hand-off includes a self-guided walkthrough video.',
    isAttending: true,
    isMuted: false,
    status: 'listening',
    autoInterveneThreshold: 'medium'
  }
];

class VoiceAgentEngine {
  private activeVoices: SpeechSynthesisVoice[] = [];
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: ((personaId: string, status: 'speaking' | 'listening' | 'idle') => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        this.activeVoices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  public onStatusChange(callback: (personaId: string, status: 'speaking' | 'listening' | 'idle') => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify(personaId: string, status: 'speaking' | 'listening' | 'idle') {
    this.listeners.forEach(cb => cb(personaId, status));
  }

  public speak(persona: MeetingPersona, text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || persona.isMuted) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      // Select voice based on gender preference
      if (this.activeVoices.length > 0) {
        const matchingVoice = this.activeVoices.find(v => {
          const langMatch = v.lang.startsWith('en');
          if (!langMatch) return false;
          if (persona.voiceGender === 'female') {
            return /female|zira|samantha|karen|victoria|moira|fiona|veena/i.test(v.name);
          } else if (persona.voiceGender === 'male') {
            return /male|david|alex|daniel|fred|george|oliver|arthur/i.test(v.name);
          }
          return true;
        }) || this.activeVoices.find(v => v.lang.startsWith('en')) || this.activeVoices[0];

        if (matchingVoice) {
          utterance.voice = matchingVoice;
        }
      }

      utterance.pitch = persona.voicePitch || 1.0;
      utterance.rate = persona.voiceRate || 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.notify(persona.id, 'speaking');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.notify(persona.id, 'listening');
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        this.isSpeaking = false;
        this.notify(persona.id, 'listening');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking(personaId?: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      if (personaId) {
        this.notify(personaId, 'listening');
      }
    }
  }

  public isVoiceActive(): boolean {
    return this.isSpeaking;
  }
}

export const voiceAgentEngine = new VoiceAgentEngine();

/**
 * Triggers an AI agent intervention / human-like contribution to the meeting via Gemini
 */
export async function triggerAgentIntervention(params: {
  persona: MeetingPersona;
  userQuery?: string;
  meetingTitle: string;
  meetingPhase?: string;
  clientName?: string;
  notes?: string;
  transcript?: string;
  agenda?: string;
  milestoneTitle?: string;
}): Promise<AgentIntervention> {
  const startTime = Date.now();
  const activeSnippets = (params.persona.knowledgeSnippets || []).filter(s => s.isActive);

  const response = await fetch('/api/meet/agent-intervene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personaId: params.persona.id,
      personaName: params.persona.name,
      role: params.persona.role,
      systemPrompt: params.persona.systemPrompt,
      customInstructions: params.persona.customInstructions,
      knowledgeSnippets: activeSnippets.map(s => ({ title: s.title, content: s.content, category: s.category })),
      communicationStyle: params.persona.communicationStyle,
      userQuery: params.userQuery,
      meetingTitle: params.meetingTitle,
      meetingPhase: params.meetingPhase,
      clientName: params.clientName,
      notes: params.notes,
      transcript: params.transcript,
      agenda: params.agenda,
      milestoneTitle: params.milestoneTitle
    })
  });

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Agent intervention failed: ${errText}`);
  }

  const data = await response.json();
  return {
    id: 'intervention_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    personaId: params.persona.id,
    personaName: params.persona.name,
    avatarUrl: params.persona.avatarUrl,
    role: params.persona.role,
    spokenText: data.spokenText,
    keyPoint: data.keyPoint,
    suggestedAction: data.suggestedAction,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    triggerType: params.userQuery ? 'direct_question' : 'autonomous_insight',
    confidenceScore: data.confidenceScore || 0.94,
    responseLatencyMs: latencyMs
  };
}

/**
 * Performs real-time sentiment and emotional tone analysis of the meeting discussion using Gemini
 */
export async function analyzeMeetingSentimentWithAI(params: {
  meetingTitle: string;
  transcript: string;
  notes?: string;
  agenda?: string;
  meetingPhase?: string;
}): Promise<MeetingSentimentAnalysis> {
  const response = await fetch('/api/meet/sentiment-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Sentiment analysis failed: ${errText}`);
  }

  const data = await response.json();
  return data.sentiment as MeetingSentimentAnalysis;
}

