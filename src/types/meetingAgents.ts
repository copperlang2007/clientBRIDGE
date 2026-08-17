export type AgentActivityStatus = 'listening' | 'processing' | 'speaking' | 'idle' | 'muted';

export interface KnowledgeSnippet {
  id: string;
  title: string;
  category: 'architecture' | 'compliance' | 'sow_contract' | 'client_policy' | 'domain_glossary';
  content: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

export interface MeetingPersona {
  id: string;
  name: string;
  role: string;
  title: string;
  avatarUrl: string;
  initials: string;
  badge: string;
  communicationStyle: 'analytical' | 'creative' | 'rigorous' | 'commercial' | 'empathic';
  voiceGender: 'female' | 'male' | 'neutral';
  voicePitch: number;
  voiceRate: number;
  systemPrompt: string;
  customInstructions?: string;
  knowledgeSnippets?: KnowledgeSnippet[];
  bio: string;
  accentColor: string;
  expertiseTags: string[];
  samplePhrase: string;
  isAttending: boolean;
  isMuted: boolean;
  status: AgentActivityStatus;
  autoInterveneThreshold: 'high' | 'medium' | 'low' | 'manual_only';
}

export interface AgentIntervention {
  id: string;
  personaId: string;
  personaName: string;
  avatarUrl: string;
  role: string;
  spokenText: string;
  keyPoint: string;
  suggestedAction?: string;
  timestamp: string;
  triggerType: 'direct_question' | 'autonomous_insight' | 'scope_alert' | 'sentiment_shift';
  confidenceScore: number;
  responseLatencyMs?: number;
}

export interface AgentActivityMetric {
  personaId: string;
  personaName: string;
  role: string;
  accentColor: string;
  totalInterventions: number;
  contributionPercentage: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  triggerBreakdown: {
    direct_question: number;
    autonomous_insight: number;
    scope_alert: number;
    sentiment_shift: number;
  };
  sentimentAlignmentScore: number;
  actionItemsTriggered: number;
}

export interface MeetingSentimentAnalysis {
  overallTone: 'Collaborative & Constructive' | 'Productive / Action-Oriented' | 'Analytical & Cautious' | 'Tense / High Scrutiny' | 'Creative & Visionary' | 'Skeptical / Scope-Sensitive';
  sentimentScore: number; // -100 to 100
  collaborationIndex: number; // 0 to 100
  clarityScore: number; // 0 to 100
  alignmentConfidence: number; // 0 to 100
  toneBadgeColor: string;
  emotionalPillars: {
    name: string;
    score: number;
    description: string;
  }[];
  liveTacticalAdvice: string[];
  keyMomentQuotes: {
    speaker: string;
    text: string;
    sentimentImpact: 'positive' | 'neutral' | 'friction';
  }[];
  analyzedAt: string;
}

