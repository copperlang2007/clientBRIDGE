import React, { useState } from 'react';
import { 
  Users, Check, X, Volume2, Sparkles, MessageSquare, 
  Sliders, ShieldCheck, Play, Square, Award, BrainCircuit, RefreshCw,
  BookOpen, Plus, Trash2, Tag, Layers, CheckCircle2, FileText, BookmarkPlus
} from 'lucide-react';
import { MeetingPersona, KnowledgeSnippet } from '../types/meetingAgents';
import { voiceAgentEngine } from '../services/voiceAgentService';

interface PersonaSelectorModalProps {
  personas: MeetingPersona[];
  onUpdatePersonas: (updatedPersonas: MeetingPersona[]) => void;
  onClose: () => void;
  initialTab?: 'settings' | 'instructions' | 'knowledge';
}

const PREDEFINED_KNOWLEDGE_TEMPLATES: {
  title: string;
  category: KnowledgeSnippet['category'];
  content: string;
  tags: string[];
}[] = [
  {
    title: 'CMS 42 CFR § 422.2274 Regulatory Rules',
    category: 'compliance',
    content: 'Medicare FMO commission payments require strict audit trails of agent tier licensing, direct carrier disbursement tracking, and TPMO disclaimer logs. Reject subjective claims without machine-checkable reconciliation tables.',
    tags: ['medicare', 'compliance', 'tpmo', 'cfr42']
  },
  {
    title: 'Fixed-Fee Floor & Milestone Escrow Protocol',
    category: 'sow_contract',
    content: 'Sprint payment releases occur exclusively upon automated Overseer verification of agreed pass conditions. Out-of-scope items (e.g. ad-hoc ERP connectors) must be parked in Phase 4 Change Order backlog.',
    tags: ['sow', 'escrow', 'scope_control', 'fixed_fee']
  },
  {
    title: 'Law 9 Machine-Checkable Predicates',
    category: 'compliance',
    content: 'All acceptance criteria must be executable code predicates or cryptographic digests (e.g. error rate < 0.01%, 100% statement match, sha256 checksum equivalence). Strictly forbid vague aesthetic terms.',
    tags: ['law9', 'verification', 'proof_invariants']
  },
  {
    title: 'Deterministic Pipeline Ingress Standard',
    category: 'architecture',
    content: 'All pipeline stages must consume raw JSON/CSV data via pure stateless functions with SHA256 content addressing. Zero reliance on ambient clock or mutable database states during validation.',
    tags: ['architecture', 'stateless', 'sha256', 'pipeline']
  },
  {
    title: 'Executive Stakeholder Alignment & Change Care',
    category: 'client_policy',
    content: 'Always reflect back client concerns in their own vocabulary before proposing procedural changes. Ensure operational teams feel supported rather than replaced.',
    tags: ['change_management', 'consensus', 'listening']
  }
];

export const PersonaSelectorModal: React.FC<PersonaSelectorModalProps> = ({
  personas,
  onUpdatePersonas,
  onClose,
  initialTab = 'settings'
}) => {
  const [localPersonas, setLocalPersonas] = useState<MeetingPersona[]>(personas);
  const [testingPersonaId, setTestingPersonaId] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(personas[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'settings' | 'instructions' | 'knowledge'>(initialTab);

  // New Snippet Form state
  const [showAddSnippet, setShowAddSnippet] = useState(false);
  const [newSnippetTitle, setNewSnippetTitle] = useState('');
  const [newSnippetCategory, setNewSnippetCategory] = useState<KnowledgeSnippet['category']>('compliance');
  const [newSnippetContent, setNewSnippetContent] = useState('');
  const [newSnippetTags, setNewSnippetTags] = useState('');

  const activePersona = localPersonas.find(p => p.id === selectedPersonaId) || localPersonas[0];

  const handleToggleAttendance = (id: string) => {
    setLocalPersonas(prev => prev.map(p => {
      if (p.id === id) {
        const nextAttending = !p.isAttending;
        return {
          ...p,
          isAttending: nextAttending,
          status: nextAttending ? 'listening' : 'idle'
        };
      }
      return p;
    }));
  };

  const handleUpdatePersonaField = (id: string, field: keyof MeetingPersona, value: any) => {
    setLocalPersonas(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleTestVoice = async (persona: MeetingPersona) => {
    if (testingPersonaId === persona.id) {
      voiceAgentEngine.stopSpeaking(persona.id);
      setTestingPersonaId(null);
      return;
    }

    setTestingPersonaId(persona.id);
    await voiceAgentEngine.speak(persona, persona.samplePhrase);
    setTestingPersonaId(null);
  };

  const handleToggleSnippetActive = (personaId: string, snippetId: string) => {
    setLocalPersonas(prev => prev.map(p => {
      if (p.id === personaId) {
        const updated = (p.knowledgeSnippets || []).map(s => {
          if (s.id === snippetId) {
            return { ...s, isActive: !s.isActive };
          }
          return s;
        });
        return { ...p, knowledgeSnippets: updated };
      }
      return p;
    }));
  };

  const handleDeleteSnippet = (personaId: string, snippetId: string) => {
    setLocalPersonas(prev => prev.map(p => {
      if (p.id === personaId) {
        const filtered = (p.knowledgeSnippets || []).filter(s => s.id !== snippetId);
        return { ...p, knowledgeSnippets: filtered };
      }
      return p;
    }));
  };

  const handleAddCustomSnippet = () => {
    if (!newSnippetTitle.trim() || !newSnippetContent.trim()) return;

    const newSnippet: KnowledgeSnippet = {
      id: `snippet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newSnippetTitle.trim(),
      category: newSnippetCategory,
      content: newSnippetContent.trim(),
      tags: newSnippetTags.split(',').map(t => t.trim()).filter(Boolean),
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setLocalPersonas(prev => prev.map(p => {
      if (p.id === activePersona.id) {
        return {
          ...p,
          knowledgeSnippets: [...(p.knowledgeSnippets || []), newSnippet]
        };
      }
      return p;
    }));

    setNewSnippetTitle('');
    setNewSnippetContent('');
    setNewSnippetTags('');
    setShowAddSnippet(false);
  };

  const handleQuickAddTemplate = (template: typeof PREDEFINED_KNOWLEDGE_TEMPLATES[0]) => {
    const newSnippet: KnowledgeSnippet = {
      id: `snippet_tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: template.title,
      category: template.category,
      content: template.content,
      tags: template.tags,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setLocalPersonas(prev => prev.map(p => {
      if (p.id === activePersona.id) {
        const existing = p.knowledgeSnippets || [];
        // Avoid duplicate if same title
        if (existing.some(s => s.title === template.title)) {
          return p;
        }
        return {
          ...p,
          knowledgeSnippets: [...existing, newSnippet]
        };
      }
      return p;
    }));
  };

  const handleSave = () => {
    onUpdatePersonas(localPersonas);
    onClose();
  };

  const activeSnippets = activePersona?.knowledgeSnippets || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vanta border border-gold/30 rounded-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col font-mono animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 bg-vanta-light/80 border-b border-gold/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shadow-lg shadow-gold/5">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-oat tracking-wide">
                  AI Voice Personas & Knowledge Configuration
                </h3>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-normal">
                  Live Attendance & In-Meeting Directives
                </span>
              </div>
              <p className="text-xs text-oat/60 mt-0.5">
                Configure specialist personas, inject custom system instructions, and attach domain knowledge snippets for in-meeting voice contributions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-oat/40 hover:text-oat hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split View (List of Personas + Detail Editor) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-gold/15">
          {/* Left Column: Persona Cards */}
          <div className="md:col-span-4 p-4 space-y-3 overflow-y-auto max-h-[580px] custom-scrollbar">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold text-gold uppercase tracking-wider">
                Specialists ({localPersonas.filter(p => p.isAttending).length}/{localPersonas.length} In Call)
              </span>
            </div>

            {localPersonas.map((persona) => {
              const isSelected = persona.id === selectedPersonaId;
              const isTesting = testingPersonaId === persona.id;
              const snippetCount = (persona.knowledgeSnippets || []).filter(s => s.isActive).length;

              return (
                <div
                  key={persona.id}
                  onClick={() => setSelectedPersonaId(persona.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-gold/10 border-gold shadow-lg shadow-gold/10 ring-1 ring-gold/40'
                      : 'bg-vanta-light/40 hover:bg-gold/5 border-gold/15'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={persona.avatarUrl}
                        alt={persona.name}
                        referrerPolicy="no-referrer"
                        className={`w-10 h-10 rounded-full object-cover border ${
                          persona.isAttending ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-gold/30 opacity-70'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-oat">{persona.name}</h4>
                          <span 
                            className="px-1.5 py-0.2 text-[9px] rounded font-bold uppercase"
                            style={{ backgroundColor: `${persona.accentColor}20`, color: persona.accentColor }}
                          >
                            {persona.communicationStyle}
                          </span>
                        </div>
                        <p className="text-[10px] text-oat/60 leading-tight">{persona.role}</p>
                      </div>
                    </div>

                    {/* Attendance Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleAttendance(persona.id);
                      }}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        persona.isAttending
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-vanta text-oat/50 border border-gold/20 hover:text-oat'
                      }`}
                    >
                      {persona.isAttending ? 'Attending' : '+ Add'}
                    </button>
                  </div>

                  <p className="text-[10px] text-oat/70 line-clamp-2 leading-relaxed">
                    {persona.bio}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-gold/10 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="text-oat/50 text-[9px] flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-gold/70" />
                        {snippetCount} Snippets
                      </span>
                      {persona.customInstructions && (
                        <span className="text-emerald-400 text-[9px] flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          Customized
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestVoice(persona);
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] flex items-center gap-1 font-bold transition-all ${
                        isTesting
                          ? 'bg-emerald-500 text-vanta animate-pulse'
                          : 'bg-vanta hover:bg-gold/20 text-gold border border-gold/20'
                      }`}
                    >
                      {isTesting ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                      {isTesting ? 'Speaking...' : 'Voice'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Persona Settings & Knowledge Base Configuration */}
          {activePersona && (
            <div className="md:col-span-8 p-5 space-y-4 overflow-y-auto max-h-[580px] custom-scrollbar flex flex-col">
              {/* Persona Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gold/15">
                <div className="flex items-center gap-3">
                  <img
                    src={activePersona.avatarUrl}
                    alt={activePersona.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border border-gold/40 shadow"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-oat flex items-center gap-2">
                      {activePersona.name}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gold/15 text-gold font-normal">
                        {activePersona.title}
                      </span>
                    </h4>
                    <p className="text-[11px] text-oat/60">{activePersona.badge}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestVoice(activePersona)}
                    className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40 rounded-lg text-xs flex items-center gap-1.5 font-bold transition-all"
                  >
                    {testingPersonaId === activePersona.id ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    {testingPersonaId === activePersona.id ? 'Stop Sample' : 'Preview Voice'}
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation */}
              <div className="flex border-b border-gold/15 gap-2">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'settings'
                      ? 'border-gold text-gold'
                      : 'border-transparent text-oat/50 hover:text-oat'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Voice & Communication Style
                </button>
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'instructions'
                      ? 'border-gold text-gold'
                      : 'border-transparent text-oat/50 hover:text-oat'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Pre-Meeting Custom Directives
                  {activePersona.customInstructions && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('knowledge')}
                  className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === 'knowledge'
                      ? 'border-gold text-gold'
                      : 'border-transparent text-oat/50 hover:text-oat'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Knowledge Base Snippets ({activeSnippets.length})
                </button>
              </div>

              {/* TAB 1: Voice & Communication Style */}
              {activeTab === 'settings' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Communication Style Selector */}
                  <div>
                    <label className="text-xs text-oat/80 block mb-1.5 font-semibold">
                      Communication Style & Persona Temperament
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'analytical', label: 'Analytical', desc: 'Rigorous architecture & ROI' },
                        { id: 'creative', label: 'Creative', desc: 'Lateral thinking & wedge narrative' },
                        { id: 'rigorous', label: 'Rigorous', desc: 'Law 9 machine-checkable proof' },
                        { id: 'commercial', label: 'Commercial', desc: 'SOW boundaries & budget protection' },
                        { id: 'empathic', label: 'Empathic', desc: 'Stakeholder consensus & clarity' }
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => handleUpdatePersonaField(activePersona.id, 'communicationStyle', style.id)}
                          className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                            activePersona.communicationStyle === style.id
                              ? 'bg-gold/15 border-gold text-gold font-bold shadow'
                              : 'bg-vanta border-gold/15 text-oat/70 hover:border-gold/40'
                          }`}
                        >
                          <div className="font-bold capitalize">{style.label}</div>
                          <div className="text-[9px] text-oat/50 font-normal leading-tight mt-0.5">{style.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice Tuning (Pitch, Rate, Gender) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-vanta-light/40 border border-gold/15 rounded-xl">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-oat/70 font-semibold">Voice Pitch</span>
                        <span className="text-gold font-mono">{activePersona.voicePitch}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.4"
                        step="0.05"
                        value={activePersona.voicePitch}
                        onChange={(e) => handleUpdatePersonaField(activePersona.id, 'voicePitch', parseFloat(e.target.value))}
                        className="w-full accent-gold cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-oat/40">
                        <span>Deep/Baritone</span>
                        <span>High/Bright</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-oat/70 font-semibold">Voice Speed / Rate</span>
                        <span className="text-gold font-mono">{activePersona.voiceRate}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="1.3"
                        step="0.05"
                        value={activePersona.voiceRate}
                        onChange={(e) => handleUpdatePersonaField(activePersona.id, 'voiceRate', parseFloat(e.target.value))}
                        className="w-full accent-gold cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-oat/40">
                        <span>Measured</span>
                        <span>Fast-Paced</span>
                      </div>
                    </div>
                  </div>

                  {/* Autonomous Intervention Sensitivity */}
                  <div>
                    <label className="text-xs text-oat/80 block mb-1.5 font-semibold">
                      Autonomous Intervention Sensitivity (Auto-Speaking in Meeting)
                    </label>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { id: 'high', label: 'High', desc: 'Frequent proactive insights' },
                        { id: 'medium', label: 'Balanced', desc: 'Standard contribution' },
                        { id: 'low', label: 'Conservative', desc: 'Critical milestones only' },
                        { id: 'manual_only', label: 'Direct Ask Only', desc: 'Silent until asked' }
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          onClick={() => handleUpdatePersonaField(activePersona.id, 'autoInterveneThreshold', lvl.id)}
                          className={`p-2 rounded-lg border text-center transition-all ${
                            activePersona.autoInterveneThreshold === lvl.id
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                              : 'bg-vanta border-gold/15 text-oat/60 hover:text-oat'
                          }`}
                        >
                          <span className="block font-bold">{lvl.label}</span>
                          <span className="text-[8px] text-oat/40 font-normal">{lvl.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Baseline System Prompt */}
                  <div>
                    <label className="text-xs text-oat/80 block mb-1 font-semibold">
                      Baseline Identity & Behavioral Mandate
                    </label>
                    <textarea
                      value={activePersona.systemPrompt}
                      onChange={(e) => handleUpdatePersonaField(activePersona.id, 'systemPrompt', e.target.value)}
                      rows={3}
                      className="w-full p-2.5 bg-vanta border border-gold/20 rounded-xl text-xs text-oat font-mono focus:outline-none focus:border-gold resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Pre-Meeting Custom Directives */}
              {activeTab === 'instructions' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 bg-gold/10 border border-gold/20 rounded-xl">
                    <h5 className="text-xs font-bold text-gold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Session Directives & Context Overrides
                    </h5>
                    <p className="text-[11px] text-oat/70 mt-1 leading-relaxed">
                      Provide specific instructions or rules for {activePersona.name} before this meeting starts. These directives are passed with top priority to Gemini whenever the agent intervenes.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-oat/80 block mb-1.5 font-semibold">
                      Custom In-Meeting Directives for {activePersona.name}
                    </label>
                    <textarea
                      value={activePersona.customInstructions || ''}
                      onChange={(e) => handleUpdatePersonaField(activePersona.id, 'customInstructions', e.target.value)}
                      placeholder="e.g. Strongly emphasize Medicare CFR § 422.2274 compliance. If the client asks about timelines, remind them Phase 1 milestone requires 3 automated machine-checkable pass predicates before signoff."
                      rows={5}
                      className="w-full p-3 bg-vanta border border-gold/20 rounded-xl text-xs text-oat font-mono focus:outline-none focus:border-gold leading-relaxed"
                    />
                  </div>

                  {/* Quick-Prompt Suggestions */}
                  <div>
                    <span className="text-[11px] text-oat/60 block mb-1.5 font-semibold">Quick Directive Starters:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Hold firm on fixed-fee boundaries; flag any out-of-scope ERP integration to Phase 4',
                        'Enforce Law 9 verification invariants: require automated checksum pass criteria',
                        'Focus entirely on client onboarding friction and reassuring executive buy-in',
                        'Decouple legacy API batches to ensure sub-second response latency'
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUpdatePersonaField(activePersona.id, 'customInstructions', preset)}
                          className="px-2.5 py-1 bg-vanta border border-gold/20 hover:border-gold/50 rounded-lg text-[10px] text-oat/80 text-left transition-colors"
                        >
                          + "{preset.substring(0, 50)}..."
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Knowledge Base Snippets */}
              {activeTab === 'knowledge' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-oat">
                        Injected Knowledge Base Snippets
                      </h5>
                      <p className="text-[10px] text-oat/60">
                        Snippets marked active are incorporated into {activePersona.name}'s real-time reasoning.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddSnippet(!showAddSnippet)}
                      className="px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {showAddSnippet ? 'Cancel' : 'Add Snippet'}
                    </button>
                  </div>

                  {/* Add Snippet Form */}
                  {showAddSnippet && (
                    <div className="p-4 bg-vanta-light/80 border border-gold/30 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between pb-1 border-b border-gold/15">
                        <span className="text-xs font-bold text-gold">Create New Domain Knowledge Snippet</span>
                        <button onClick={() => setShowAddSnippet(false)} className="text-oat/40 hover:text-oat">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-oat/60 block mb-1">Snippet Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Apex Health Custom Commission Schedule"
                            value={newSnippetTitle}
                            onChange={(e) => setNewSnippetTitle(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-oat/60 block mb-1">Category</label>
                          <select
                            value={newSnippetCategory}
                            onChange={(e) => setNewSnippetCategory(e.target.value as any)}
                            className="w-full px-2.5 py-1.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                          >
                            <option value="compliance">Compliance / Regulatory</option>
                            <option value="architecture">System Architecture</option>
                            <option value="sow_contract">SOW & Contract Boundaries</option>
                            <option value="client_policy">Client Specific Policy</option>
                            <option value="domain_glossary">Domain Glossary</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-oat/60 block mb-1">Knowledge Content / Fact Specification</label>
                        <textarea
                          placeholder="Paste client policies, compliance rules, API specifications, or contractual constraints..."
                          value={newSnippetContent}
                          onChange={(e) => setNewSnippetContent(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat font-mono focus:outline-none focus:border-gold resize-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-oat/60 block mb-1">Tags (comma-separated)</label>
                        <input
                          type="text"
                          placeholder="e.g. commission, cms, reconciliation, q3"
                          value={newSnippetTags}
                          onChange={(e) => setNewSnippetTags(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-vanta border border-gold/20 rounded-lg text-xs text-oat focus:outline-none focus:border-gold"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setShowAddSnippet(false)}
                          className="px-3 py-1 bg-vanta text-oat/60 rounded text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddCustomSnippet}
                          disabled={!newSnippetTitle.trim() || !newSnippetContent.trim()}
                          className="px-4 py-1.5 bg-gold hover:bg-gold/90 disabled:opacity-40 text-vanta font-bold rounded text-xs flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Save Snippet
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick-Apply Domain Knowledge Templates */}
                  <div>
                    <span className="text-[10px] text-gold font-bold uppercase tracking-wider block mb-1.5">
                      Quick-Load Domain Knowledge Templates:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PREDEFINED_KNOWLEDGE_TEMPLATES.map((tpl, i) => {
                        const isAlreadyAdded = activeSnippets.some(s => s.title === tpl.title);
                        return (
                          <div
                            key={i}
                            className="p-2.5 bg-vanta border border-gold/15 hover:border-gold/40 rounded-xl flex flex-col justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-oat text-[11px] truncate">{tpl.title}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gold/10 text-gold uppercase">
                                  {tpl.category}
                                </span>
                              </div>
                              <p className="text-[10px] text-oat/60 line-clamp-2 mt-1">
                                {tpl.content}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-1 border-t border-gold/10">
                              <div className="flex gap-1">
                                {tpl.tags.slice(0, 2).map((t, idx) => (
                                  <span key={idx} className="text-[8px] text-oat/40">#{t}</span>
                                ))}
                              </div>
                              <button
                                onClick={() => handleQuickAddTemplate(tpl)}
                                disabled={isAlreadyAdded}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                                  isAlreadyAdded
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                                    : 'bg-gold/20 hover:bg-gold/30 text-gold border border-gold/30'
                                }`}
                              >
                                {isAlreadyAdded ? 'Active' : '+ Load Template'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Snippets List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] text-oat/70 font-semibold block">
                      Active Knowledge Snippets ({activeSnippets.length})
                    </span>

                    {activeSnippets.length === 0 ? (
                      <div className="p-6 bg-vanta border border-dashed border-gold/20 rounded-xl text-center">
                        <BookOpen className="w-6 h-6 text-gold/40 mx-auto mb-2" />
                        <p className="text-xs text-oat/60">No knowledge snippets attached to {activePersona.name} yet.</p>
                        <p className="text-[10px] text-oat/40 mt-0.5">Click 'Add Snippet' or select a domain template above to inject client context.</p>
                      </div>
                    ) : (
                      activeSnippets.map((snippet) => (
                        <div
                          key={snippet.id}
                          className={`p-3 rounded-xl border transition-all ${
                            snippet.isActive
                              ? 'bg-vanta-light/50 border-gold/30'
                              : 'bg-vanta/30 border-gold/10 opacity-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleSnippetActive(activePersona.id, snippet.id)}
                                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                                  snippet.isActive
                                    ? 'bg-emerald-500 border-emerald-500 text-vanta'
                                    : 'border-gold/30 text-transparent'
                                }`}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <h6 className="text-xs font-bold text-oat">{snippet.title}</h6>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-gold/10 text-gold uppercase">
                                {snippet.category}
                              </span>
                            </div>

                            <button
                              onClick={() => handleDeleteSnippet(activePersona.id, snippet.id)}
                              className="text-oat/30 hover:text-red-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[11px] text-oat/70 font-mono mt-1.5 pl-6 leading-relaxed">
                            {snippet.content}
                          </p>

                          <div className="flex items-center gap-1 pl-6 mt-2">
                            {(snippet.tags || []).map((t, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.2 rounded bg-vanta text-oat/50 border border-gold/10">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-vanta-light/80 border-t border-gold/20 flex items-center justify-between">
          <div className="text-xs text-oat/60 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Persona directives and knowledge snippets are synced directly to Gemini 3.7 live reasoning.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-vanta hover:bg-white/5 text-oat/70 rounded-lg text-xs"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2 bg-gold hover:bg-gold/90 text-vanta font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-gold/15"
            >
              <Check className="w-4 h-4" />
              Save & Apply Persona Directives
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
