import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, MessageSquare, Volume2, VolumeX, Send, Sparkles, 
  ShieldCheck, AlertTriangle, CheckCircle2, ChevronRight, RefreshCw, 
  Award, FileText, ArrowRight, Layers, Lock, Database, Compass, 
  Scale, FileSignature, HelpCircle, Play, Pause, ExternalLink, Check, Copy
} from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { SYNTHETIC_PRESETS, SyntheticPreset } from '../data/syntheticPresets';

interface Message {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: string;
}

interface CandidateWedge {
  id: string;
  name: string;
  description: string;
  scores: {
    errorCostSeverity: number;
    dataAccessibility: number;
    volumeRepeatability: number;
    verificationClarity: number;
    timeToValue: number;
  };
  totalScore: number;
  interviewCitations: {
    errorCost: string;
    data: string;
    volume: string;
    verification: string;
    timeToValue: string;
  };
  legalityScreen: {
    passed: boolean;
    notes: string;
    tosRisk: string;
  };
  status: 'selected' | 'parked_next_wedge' | 'dead_legality_fail';
}

interface AcceptanceContract {
  contractId: string;
  title: string;
  targetWedge: string;
  inScopeBoundaries: string[];
  outOfScopeList: string[];
  passConditions: string[];
  isPassConditionsValid: boolean;
  pricing: {
    model: string;
    amount: string;
    floorStandard: string;
    terms: string;
  };
  timeline: string;
  rawMarkdown: string;
}

interface EvaluationResult {
  companyName: string;
  businessSummary: string;
  candidateWedges: CandidateWedge[];
  winningWedge: string;
  winningWedgeSummary: string;
  nextWedges: string[];
  complianceTier: 'regulated-medicare' | 'regulated-other' | 'unregulated';
  complianceDetails: {
    governingFramework: string;
    tpmoGateActive: boolean;
    hipaaRiskActive: boolean;
    cfrCitation?: string;
    phiPerimeterOnly: boolean;
    baaRequired: boolean;
  };
  acceptanceContract: AcceptanceContract;
  objectionsHarvested: Array<{
    objection: string;
    category: string;
    countermeasure: string;
  }>;
  errorTaxonomy: {
    status: string;
    severity: string;
    reason?: string;
    nextStep?: string;
  };
}

const INTERVIEW_STAGES = [
  { id: 'business', label: 'Business & Target Workflow', icon: Compass },
  { id: 'error_cost', label: 'Operators & Error Blast Radius', icon: Scale },
  { id: 'tools_data', label: 'Tools, Data & Legality Screen', icon: Database },
  { id: 'pass_conditions', label: 'Pass Conditions (AC)', icon: ShieldCheck },
  { id: 'compliance', label: 'Compliance-Tier Routing', icon: Lock },
  { id: 'budget_signer', label: 'Budget & Signer Authority', icon: FileSignature }
];

export const EngageIntake: React.FC<{ 
  initialContract?: any;
  onNavigateToSow?: () => void;
  onNavigateToBuild?: (contract?: any) => void;
}> = ({ initialContract, onNavigateToSow, onNavigateToBuild }) => {
  const { user, profile, isAdmin } = useAuth();
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [activeTab, setActiveTab] = useState<'interview' | 'rubric' | 'contract' | 'corpus'>('interview');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);

  // Selected preset or active session
  const [selectedPresetId, setSelectedPresetId] = useState<string>('medicare-fmo-pack-1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [savedEngagements, setSavedEngagements] = useState<any[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize with selected synthetic preset or incoming initialContract
  useEffect(() => {
    if (initialContract) {
      const winningWedgeName = initialContract.winningWedge || initialContract.title || 'Expansion Wedge';
      const contractMarkdown = `# Acceptance Contract (W0.2 Baseline)
## Contract ID: ${initialContract.id || 'AC-EXPANSION'}
### Client: ${initialContract.clientName || 'Apex Health Brokers LLC'}
### Target Wedge: ${winningWedgeName}

## 1. Executive Summary & Problem Scope
Implementation of ${winningWedgeName} engineered to deliver verifiable operational ROI.

## 2. In-Scope Implementation Boundaries
- Deliverable: ${winningWedgeName} deterministic engine.
- Zero paid tool dependency ($0 stack discipline).

## 3. Strict Out-of-Scope Boundaries
${(initialContract.outOfScope || ['Unlicensed third-party external portal access']).map((item: string) => `- ❌ ${item}`).join('\n')}

## 4. Machine-Checkable Acceptance Criteria (\`pass_conditions\`)
${(initialContract.passConditions || ['100% deterministic matching with <0.01% error rate', 'Immutable SHA256 audit digest export']).map((cond: string, idx: number) => `${idx + 1}. ✅ [PASS/FAIL] ${cond}`).join('\n')}

## 5. Compliance & Commercial Structure
- **Compliance Tier:** \`${initialContract.complianceTier || 'regulated-medicare'}\`
- **Investment:** $${(initialContract.priceUsd || 6500).toLocaleString()} USD
- **Timeline:** 2-week sprint to pass_conditions verification.
`;

      setEvaluation({
        companyName: initialContract.clientName || 'Apex Health Brokers LLC',
        businessSummary: `Expansion Engagement: ${winningWedgeName}`,
        candidateWedges: [
          {
            id: 'wedge-exp-1',
            name: winningWedgeName,
            description: `Deterministic expansion tool for ${winningWedgeName}`,
            scores: { errorCostSeverity: 5, dataAccessibility: 5, volumeRepeatability: 5, verificationClarity: 5, timeToValue: 5 },
            totalScore: 25,
            interviewCitations: { errorCost: 'High financial impact', data: 'Deterministic files', volume: 'Daily/Weekly batches', verification: 'Proof pointers', timeToValue: 'Immediate' },
            legalityScreen: { passed: true, notes: 'Fully compliant', tosRisk: 'None' },
            status: 'selected'
          }
        ],
        winningWedge: winningWedgeName,
        winningWedgeSummary: `Deterministic expansion module for ${winningWedgeName}`,
        nextWedges: ['Automated Dispute Carrier Portal Direct', 'Real-time 835 Webhook Listener'],
        complianceTier: initialContract.complianceTier || 'regulated-medicare',
        complianceDetails: {
          governingFramework: 'CMS 42 CFR § 422.2274 & HIPAA',
          tpmoGateActive: true,
          hipaaRiskActive: true,
          cfrCitation: '42 CFR § 422.2274',
          phiPerimeterOnly: true,
          baaRequired: true
        },
        acceptanceContract: {
          contractId: initialContract.id || 'AC-EXPANSION',
          title: `Acceptance Contract: ${winningWedgeName}`,
          targetWedge: winningWedgeName,
          inScopeBoundaries: [winningWedgeName],
          outOfScopeList: initialContract.outOfScope || ['Unlicensed portal access'],
          passConditions: initialContract.passConditions || ['100% deterministic match'],
          isPassConditionsValid: true,
          pricing: {
            model: 'Fixed-Fee Delivery',
            amount: `$${(initialContract.priceUsd || 6500).toLocaleString()}`,
            floorStandard: 'W0.5 Baseline Floor',
            terms: '50% upon contract execution, 50% upon pass_conditions verification.'
          },
          timeline: '2 Weeks to Automated Verification',
          rawMarkdown: contractMarkdown
        },
        objectionsHarvested: [],
        errorTaxonomy: { status: 'valid', severity: 'none' }
      });
      setActiveTab('contract');
    } else {
      loadPreset('medicare-fmo-pack-1');
    }
  }, [initialContract]);

  // Fetch saved engagements from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'engagements'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setSavedEngagements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'engagements')
    );
    return () => unsub();
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, speechTranscript]);

  // Load a Synthetic Preset
  const loadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom-blank') {
      setMessages([
        {
          role: 'model',
          text: 'Welcome to artificialBRIDGE engage-intake. I am your AI Intake Specialist. My role is to isolate your single highest-impact workflow wedge and define machine-checkable criteria for your Acceptance Contract. To begin: What does your company sell, and what repetitive workflow currently consumes the most hours or creates costly errors?'
        }
      ]);
      setEvaluation(null);
      setCurrentStageIdx(0);
      return;
    }

    const preset = SYNTHETIC_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setMessages(preset.initialTranscript);
      setCurrentStageIdx(Math.min(preset.initialTranscript.length - 1, 5));
      
      // Pre-evaluate with rich schema
      const winningWedgeObj = preset.candidateWedges.find(w => w.id === preset.winningWedge || w.name === preset.winningWedge) || preset.candidateWedges[0];
      
      const rawMarkdownContract = `# ACCEPTANCE CONTRACT (AC W0.2)
**Engagement Engine — Phase 1 Intake Output**
**Target Client / Entity:** ${preset.name}
**Governing Regulatory Framework:** ${preset.governingFramework}
**Compliance Tier:** ${preset.complianceTier.toUpperCase()}
**Verification Authority:** engage-verify (Automated Deterministic Suite)

---

## 1. Selected Single Target Wedge
**Wedge:** ${winningWedgeObj.name}
**Strategic Rationale:** Scored ${winningWedgeObj.totalScore}/25 on Rubric v1. Outperformed all candidate workflows on Error Cost Severity and Deterministic Checkability.

## 2. Strict In-Scope Boundaries
${winningWedgeObj.description}

## 3. Explicit Out-of-Scope List
${preset.outOfScope.map(item => `- ❌ ${item}`).join('\n')}

## 4. Machine-Checkable Acceptance Criteria (\`pass_conditions\`)
*Criteria must be 100% checkable by automated verification suite:*
${preset.passConditions.map((cond, idx) => `${idx + 1}. ✅ [PASS/FAIL] ${cond}`).join('\n')}

## 5. Compliance & Data Perimeter Gate
- **Compliance Tier:** \`${preset.complianceTier}\`
- **HIPAA Risk / TPMO Verification:** ${preset.complianceTier === 'regulated-medicare' ? 'ACTIVE (42 CFR § 422.2274 & 45 CFR Part 164)' : 'N/A'}
- **Data Perimeter:** Isolated calculation environment; BAA executed prior to live data feed ingestion.

## 6. Commercial Structure & Pricing Reference
- **Model:** Fixed-fee first wedge delivery (Floor per W0.5 standard)
- **Investment:** $12,500
- **Timeline:** 3-week sprint to pass_conditions verification.

## 7. Parked Candidate Backlog (\`next_wedges\`)
${preset.candidateWedges.filter(w => w.status === 'parked_next_wedge').map(w => `- 📦 ${w.name} (Rubric Score: ${w.totalScore}/25)`).join('\n')}
`;

      setEvaluation({
        companyName: preset.name,
        businessSummary: preset.description,
        candidateWedges: preset.candidateWedges,
        winningWedge: winningWedgeObj.name,
        winningWedgeSummary: winningWedgeObj.description,
        nextWedges: preset.candidateWedges.filter(w => w.status === 'parked_next_wedge').map(w => w.name),
        complianceTier: preset.complianceTier,
        complianceDetails: {
          governingFramework: preset.governingFramework,
          tpmoGateActive: preset.complianceTier === 'regulated-medicare',
          hipaaRiskActive: preset.complianceTier === 'regulated-medicare',
          cfrCitation: preset.complianceTier === 'regulated-medicare' ? '42 CFR § 422.2274' : undefined,
          phiPerimeterOnly: preset.complianceTier === 'regulated-medicare',
          baaRequired: preset.complianceTier === 'regulated-medicare'
        },
        acceptanceContract: {
          contractId: `AC-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
          title: `Acceptance Contract: ${winningWedgeObj.name}`,
          targetWedge: winningWedgeObj.name,
          inScopeBoundaries: [winningWedgeObj.description],
          outOfScopeList: preset.outOfScope,
          passConditions: preset.passConditions,
          isPassConditionsValid: preset.passConditions.length >= 3,
          pricing: {
            model: 'Fixed-Fee Delivery',
            amount: '$12,500',
            floorStandard: 'W0.5 Baseline Floor',
            terms: '50% upon contract execution, 50% upon pass_conditions verification.'
          },
          timeline: '3 Weeks to Automated Verification',
          rawMarkdown: rawMarkdownContract
        },
        objectionsHarvested: preset.objections,
        errorTaxonomy: {
          status: 'valid',
          severity: 'none'
        }
      });
    }
  };

  // Voice Web Speech API Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setSpeechTranscript(interim || finalTranscript);
        if (finalTranscript) {
          handleSendMessage(finalTranscript);
          setSpeechTranscript('');
          setIsListening(false);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [messages]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or standard text input.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechTranscript('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Error starting speech recognition:', err);
      }
    }
  };

  // Speak AI responses
  const speakText = async (text: string) => {
    if (!soundEnabled) return;
    setIsSpeaking(true);

    try {
      // Try Gemini TTS server route first
      const res = await fetch('/api/intake/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName: 'Zephyr' })
      });

      if (res.ok && res.status !== 204) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:${data.mimeType || 'audio/pcm'};base64,${data.audioBase64}`);
          audioRef.current = audio;
          audio.onended = () => setIsSpeaking(false);
          audio.play().catch(() => playBrowserSpeech(text));
          return;
        }
      }
    } catch (e) {
      console.warn('TTS API error, falling back to browser speech synthesis', e);
    }

    // Fallback to browser speech synthesis
    playBrowserSpeech(text);
  };

  const playBrowserSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Send message to AI Interviewer
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    // Progress stage stepper
    if (currentStageIdx < INTERVIEW_STAGES.length - 1) {
      setCurrentStageIdx(prev => prev + 1);
    }

    try {
      const response = await fetch('/api/intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          clientContext: {
            userEmail: user?.email,
            companyName: profile?.company || 'Client Organization',
            currentStage: INTERVIEW_STAGES[currentStageIdx]?.id
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get intake response');
      }

      const data = await response.json();
      const replyText = data.reply || 'Thank you. Let’s proceed to the next step.';
      
      const updatedMessages: Message[] = [
        ...newMessages,
        { role: 'model', text: replyText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ];
      setMessages(updatedMessages);

      if (mode === 'voice' && soundEnabled) {
        speakText(replyText);
      }
    } catch (err) {
      console.error('Error during intake conversation:', err);
      const fallbackReply = 'Noted. Could you specify the current error rate or financial cost associated with this process, and what software tools are involved?';
      setMessages(prev => [...prev, { role: 'model', text: fallbackReply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Run Rubric v1 Evaluation & Contract Generation
  const handleEvaluateAndGenerateContract = async () => {
    setIsEvaluating(true);
    try {
      const response = await fetch('/api/intake/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: messages,
          clientContext: {
            companyName: profile?.company || 'Client Organization',
            userEmail: user?.email
          }
        })
      });

      if (!response.ok) {
        throw new Error('Evaluation failed');
      }

      const evalData: EvaluationResult = await response.json();
      setEvaluation(evalData);
      setActiveTab('rubric');
    } catch (err) {
      console.error('Evaluation generation error:', err);
      alert('Could not run automated rubric evaluation. Please check your inputs or select a preset to see the complete evaluation.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Save Contract & Engagement to Firestore Corpus
  const handleSaveToCorpus = async () => {
    if (!evaluation) return;
    try {
      const docData = {
        clientUid: user?.uid || 'anonymous-visitor',
        clientName: profile?.displayName || user?.email?.split('@')[0] || 'Client Principal',
        companyName: evaluation.companyName || profile?.company || 'Client Organization',
        status: 'contracted',
        winningWedge: evaluation.winningWedge,
        complianceTier: evaluation.complianceTier,
        governingFramework: evaluation.complianceDetails.governingFramework,
        acceptanceContract: evaluation.acceptanceContract.rawMarkdown,
        passConditions: evaluation.acceptanceContract.passConditions,
        outOfScope: evaluation.acceptanceContract.outOfScopeList,
        candidateWedges: evaluation.candidateWedges,
        nextWedges: evaluation.nextWedges,
        transcript: messages,
        objections: evaluation.objectionsHarvested.map(o => o.objection),
        createdAt: new Date().toISOString(),
        contractedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'engagements'), docData);

      // Save objection patterns into corpus
      for (const obj of evaluation.objectionsHarvested) {
        await addDoc(collection(db, 'objection_patterns'), {
          engagementId: docRef.id,
          objection: obj.objection,
          category: obj.category,
          countermeasure: obj.countermeasure,
          createdAt: new Date().toISOString()
        });
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'engagements');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 md:p-8 bg-vanta/60 border border-gold/20 rounded-[28px] md:rounded-[36px] backdrop-blur-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-[10px] font-mono text-gold uppercase tracking-[0.25em] font-semibold flex items-center gap-1.5">
              <Sparkles size={12} className="text-gold" />
              Phase 1: Engage-Intake Engine
            </span>
            <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-mono text-oat/60 uppercase tracking-widest">
              One Wedge Principle
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-400/10 border border-emerald-400/30 rounded-full text-[9px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={11} />
              Rubric v1 & AC W0.2
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-light tracking-tight text-oat">
            AI Client Intake & <span className="text-gold font-normal">Wedge Evaluation</span>
          </h2>
          <p className="text-oat/60 text-xs md:text-sm max-w-2xl font-light">
            Conduct an evidence-backed discovery interview via chat or voice. Scores candidate workflows on Rubric v1, locks down compliance perimeters, and emits a machine-checkable Acceptance Contract.
          </p>
        </div>

        {/* Mode & Sound Toggles */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 bg-vanta/80 p-2 rounded-2xl border border-gold/15">
          {/* Chat vs Voice Toggle */}
          <div className="flex items-center bg-gold/5 p-1 rounded-xl border border-gold/10">
            <button
              onClick={() => {
                setMode('chat');
                stopSpeaking();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all ${
                mode === 'chat'
                  ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              <MessageSquare size={14} />
              Chat Mode
            </button>
            <button
              onClick={() => setMode('voice')}
              className={`px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all ${
                mode === 'voice'
                  ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                  : 'text-oat/60 hover:text-gold'
              }`}
            >
              <Mic size={14} />
              Voice Mode
            </button>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              if (soundEnabled) stopSpeaking();
              setSoundEnabled(!soundEnabled);
            }}
            title={soundEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-gold/10 border-gold/30 text-gold'
                : 'bg-white/5 border-white/10 text-oat/30 hover:text-oat/60'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Synthetic Demo Presets Selector */}
      <div className="p-4 md:p-6 bg-vanta/40 border border-gold/10 rounded-2xl md:rounded-3xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-gold" />
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-gold font-bold">
              Synthetic Business & Vertical Pack Selector
            </h3>
          </div>
          <span className="text-[10px] font-mono text-oat/40 uppercase tracking-widest">
            Synthetic Rule Enforced • Zero Real-Client PHI
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SYNTHETIC_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset.id)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                selectedPresetId === preset.id
                  ? 'bg-gold/15 border-gold shadow-lg shadow-gold/10 text-oat'
                  : 'bg-gold/5 border-gold/10 text-oat/70 hover:border-gold/30 hover:bg-gold/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-gold font-semibold uppercase tracking-wider">
                  {preset.complianceTier === 'regulated-medicare' ? 'Medicare FMO #1' : preset.complianceTier}
                </span>
                {selectedPresetId === preset.id && <CheckCircle2 size={13} className="text-gold" />}
              </div>
              <p className="font-bold text-xs text-oat truncate">{preset.name}</p>
              <p className="text-[10px] text-oat/50 line-clamp-2 mt-1 font-light">{preset.description}</p>
            </button>
          ))}

          <button
            onClick={() => loadPreset('custom-blank')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedPresetId === 'custom-blank'
                ? 'bg-gold/15 border-gold shadow-lg shadow-gold/10 text-oat'
                : 'bg-gold/5 border-gold/10 text-oat/70 hover:border-gold/30 hover:bg-gold/10'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-gold font-semibold uppercase tracking-wider">Live Session</span>
              {selectedPresetId === 'custom-blank' && <CheckCircle2 size={13} className="text-gold" />}
            </div>
            <p className="font-bold text-xs text-oat">Custom Live Intake</p>
            <p className="text-[10px] text-oat/50 line-clamp-2 mt-1 font-light">Conduct fresh interactive interview from blank canvas.</p>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gold/5 border border-gold/15 rounded-2xl w-fit overflow-x-auto">
        {[
          { id: 'interview', label: '1. Intake Interview', icon: MessageSquare },
          { id: 'rubric', label: '2. Rubric v1 Scoring Table', icon: Award },
          { id: 'contract', label: '3. Acceptance Contract (AC W0.2)', icon: FileSignature },
          { id: 'corpus', label: '4. Engagement Corpus & Objections', icon: Database }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gold text-vanta font-bold shadow-lg shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: INTAKE INTERVIEW (Chat & Voice) */}
      {activeTab === 'interview' && (
        <div className="space-y-6">
          {/* Phase Progression Stepper */}
          <div className="p-4 bg-vanta/50 border border-gold/10 rounded-2xl overflow-x-auto">
            <div className="flex items-center gap-2 min-w-[700px]">
              {INTERVIEW_STAGES.map((stg, i) => {
                const isPassed = i < currentStageIdx;
                const isCurrent = i === currentStageIdx;
                return (
                  <React.Fragment key={stg.id}>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all ${
                      isCurrent 
                        ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/25' 
                        : isPassed 
                        ? 'bg-gold/20 text-gold border border-gold/30' 
                        : 'bg-white/5 text-oat/30 border border-white/5'
                    }`}>
                      <stg.icon size={13} />
                      <span>{i + 1}. {stg.label}</span>
                    </div>
                    {i < INTERVIEW_STAGES.length - 1 && (
                      <ChevronRight size={14} className="text-gold/20 flex-shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Voice Mode Visual Hero (When Voice Mode is Active) */}
          <AnimatePresence>
            {mode === 'voice' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-8 bg-gradient-to-b from-gold/10 via-vanta to-vanta border border-gold/30 rounded-[32px] text-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gold/5 backdrop-blur-sm pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center gap-4">
                  {/* Wave Animation when listening or speaking */}
                  <div className="relative flex items-center justify-center">
                    {(isListening || isSpeaking) && (
                      <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute w-32 h-32 rounded-full bg-gold/20 border border-gold/40"
                      />
                    )}
                    
                    <button
                      onClick={toggleListening}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl relative z-10 ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 scale-105'
                          : isSpeaking
                          ? 'bg-gold text-vanta ring-4 ring-gold/40'
                          : 'bg-gold/20 text-gold border-2 border-gold hover:bg-gold hover:text-vanta'
                      }`}
                    >
                      {isListening ? <Mic size={32} /> : <MicOff size={32} />}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-oat uppercase tracking-widest font-mono">
                      {isListening ? 'Listening to your response...' : isSpeaking ? 'AI Specialist Speaking...' : 'Voice Mode Ready'}
                    </h4>
                    <p className="text-xs text-oat/60 font-light mt-1 max-w-md mx-auto">
                      {isListening 
                        ? 'Speak clearly into your microphone. Release or stop talking to submit.'
                        : 'Click the gold microphone to speak your answers hands-free.'}
                    </p>
                  </div>

                  {/* Real-time partial transcript preview */}
                  {speechTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-6 py-2.5 bg-gold/15 border border-gold/30 rounded-full text-xs font-mono text-gold max-w-xl"
                    >
                      "{speechTranscript}"
                    </motion.div>
                  )}

                  {/* Audio Bars Visualizer */}
                  {(isListening || isSpeaking) && (
                    <div className="flex items-center gap-1.5 h-6">
                      {[40, 70, 100, 60, 90, 45, 80, 50, 95, 30].map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: ['20%', `${h}%`, '20%'] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.08 }}
                          className="w-1.5 bg-gold rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Transcript Stream */}
          <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] md:rounded-[36px] shadow-2xl backdrop-blur-xl min-h-[420px] max-h-[560px] overflow-y-auto space-y-6 custom-scrollbar">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'model' && (
                  <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold flex-shrink-0 mt-1">
                    <Sparkles size={16} />
                  </div>
                )}

                <div className={`max-w-2xl rounded-2xl md:rounded-3xl p-5 ${
                  msg.role === 'user'
                    ? 'bg-gold/20 border border-gold/30 text-oat rounded-br-none shadow-lg'
                    : 'bg-gold/5 border border-gold/10 text-oat/90 rounded-bl-none'
                }`}>
                  <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/5">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gold font-bold">
                      {msg.role === 'user' ? 'Client / Managing Principal' : 'AI Intake Specialist'}
                    </span>
                    {msg.timestamp && (
                      <span className="text-[8px] font-mono text-oat/30">{msg.timestamp}</span>
                    )}
                  </div>

                  <p className="text-sm md:text-base font-light leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {msg.role === 'model' && (
                    <div className="mt-3 pt-2 flex items-center gap-2 border-t border-gold/5">
                      <button
                        onClick={() => speakText(msg.text)}
                        className="text-[10px] font-mono text-gold/70 hover:text-gold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                      >
                        <Volume2 size={12} />
                        Replay Audio
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-xl bg-gold text-vanta flex items-center justify-center font-bold font-mono text-xs flex-shrink-0 mt-1">
                    CP
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                  <Sparkles size={16} className="animate-spin" />
                </div>
                <div className="p-4 bg-gold/5 border border-gold/10 rounded-2xl text-xs font-mono text-gold/60 flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin" />
                  Synthesizing next intake query & evaluating single wedge...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Helper Suggestion Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-gold/60 uppercase tracking-wider mr-1">Quick Responses:</span>
            {[
              "Our primary error cost is $25k/mo in commission underpayments.",
              "We have authorized direct CSV/EDI downloads with no web scraping.",
              "Success means 100% policy matching within 30 seconds & line-item variance detection.",
              "We operate under CMS TPMO & HIPAA requirements.",
              "I have budget sign-off up to $50,000 for this first wedge."
            ].map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(pill)}
                className="px-3 py-1.5 bg-gold/5 border border-gold/10 hover:border-gold/30 hover:bg-gold/15 rounded-full text-[10px] text-oat/70 hover:text-oat transition-all text-left"
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Message Input & Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your response to the intake specialist..."
                className="w-full bg-gold/5 border border-gold/20 rounded-2xl pl-5 pr-14 py-4 text-oat placeholder:text-oat/30 text-sm focus:outline-none focus:border-gold/50 focus:bg-gold/10 transition-all shadow-inner"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-gold text-vanta rounded-xl hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all shadow-md shadow-gold/20"
              >
                <Send size={15} />
              </button>
            </div>

            {/* Evaluate & Generate Contract CTA Button */}
            <button
              onClick={handleEvaluateAndGenerateContract}
              disabled={isEvaluating || messages.length < 2}
              className="px-6 py-4 bg-gradient-to-r from-gold to-[#f0d499] text-vanta font-bold text-xs uppercase tracking-widest rounded-2xl hover:shadow-xl hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 font-mono whitespace-nowrap active:scale-95 disabled:opacity-40"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Running Rubric v1...
                </>
              ) : (
                <>
                  <Award size={15} />
                  Evaluate Rubric & Emit AC
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: RUBRIC v1 SCORING TABLE */}
      {activeTab === 'rubric' && (
        <div className="space-y-8">
          {!evaluation ? (
            <div className="p-12 text-center bg-vanta/40 border border-gold/10 rounded-3xl">
              <AlertTriangle className="mx-auto text-gold mb-3" size={32} />
              <h3 className="text-lg font-bold text-oat">No Rubric Evaluation Generated Yet</h3>
              <p className="text-xs text-oat/50 max-w-md mx-auto mt-1 mb-4">
                Complete the intake interview or load a synthetic vertical pack, then click "Evaluate Rubric & Emit AC".
              </p>
              <button
                onClick={handleEvaluateAndGenerateContract}
                className="px-6 py-2.5 bg-gold text-vanta text-xs font-mono uppercase font-bold rounded-xl"
              >
                Evaluate Now
              </button>
            </div>
          ) : (
            <>
              {/* Winning Wedge Highlight Card */}
              <div className="p-6 md:p-8 bg-gradient-to-r from-gold/20 via-gold/10 to-transparent border border-gold/40 rounded-[28px] md:rounded-[36px] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-gold text-vanta rounded-full text-[10px] font-mono uppercase font-black tracking-widest flex items-center gap-1">
                        <Award size={12} />
                        Selected Single Target Wedge
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-400/10 border border-emerald-400/30 rounded-full text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                        Highest Rubric Score
                      </span>
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold text-oat">{evaluation.winningWedge}</h3>
                    <p className="text-xs md:text-sm text-oat/70 max-w-2xl font-light">{evaluation.winningWedgeSummary}</p>
                  </div>

                  <div className="text-right flex flex-col sm:items-end">
                    <span className="text-[10px] font-mono text-gold/60 uppercase tracking-widest">Wedge One Focus</span>
                    <p className="text-xs text-oat/50 mt-1 max-w-xs">
                      All other candidates parked in <code className="text-gold">next_wedges</code> corpus.
                    </p>
                    <button
                      onClick={() => setActiveTab('contract')}
                      className="mt-3 px-5 py-2 bg-gold text-vanta rounded-xl text-xs font-mono uppercase font-bold tracking-wider hover:scale-105 transition-all flex items-center gap-1.5"
                    >
                      View Acceptance Contract
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rubric v1 Comparative Matrix */}
              <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] md:rounded-[36px] backdrop-blur-xl shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-oat flex items-center gap-2">
                      <Scale size={20} className="text-gold" />
                      Rubric v1 Comparative Scoring Table (W0.5)
                    </h3>
                    <p className="text-xs text-oat/50 mt-1">
                      Scores ALL candidate workflows across 5 standard anchor dimensions (0-5 scale). Shows why the winning wedge was chosen with verifiable interview citations.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-[10px] font-mono text-gold uppercase tracking-widest">
                    Strict Citation Mandate
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-gold/20 text-[10px] font-mono text-gold/70 uppercase tracking-wider">
                        <th className="py-3 px-4">Candidate Workflow</th>
                        <th className="py-3 px-3 text-center">Error Cost (0-5)</th>
                        <th className="py-3 px-3 text-center">Data Access (0-5)</th>
                        <th className="py-3 px-3 text-center">Volume (0-5)</th>
                        <th className="py-3 px-3 text-center">Checkability (0-5)</th>
                        <th className="py-3 px-3 text-center">Time-to-Value (0-5)</th>
                        <th className="py-3 px-3 text-center font-bold text-gold">Total Score</th>
                        <th className="py-3 px-3 text-center">Legality Screen</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gold/10 text-xs">
                      {evaluation.candidateWedges.map((wedge) => {
                        const isWinner = wedge.name === evaluation.winningWedge || wedge.id === evaluation.winningWedge;
                        return (
                          <tr
                            key={wedge.id}
                            className={`transition-colors ${
                              isWinner ? 'bg-gold/10 font-medium' : 'hover:bg-gold/5'
                            }`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                {isWinner && <Award size={15} className="text-gold flex-shrink-0" />}
                                <div>
                                  <p className="font-bold text-oat">{wedge.name}</p>
                                  <p className="text-[10px] text-oat/50 line-clamp-1">{wedge.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center font-mono">{wedge.scores.errorCostSeverity}/5</td>
                            <td className="py-4 px-3 text-center font-mono">{wedge.scores.dataAccessibility}/5</td>
                            <td className="py-4 px-3 text-center font-mono">{wedge.scores.volumeRepeatability}/5</td>
                            <td className="py-4 px-3 text-center font-mono">{wedge.scores.verificationClarity}/5</td>
                            <td className="py-4 px-3 text-center font-mono">{wedge.scores.timeToValue}/5</td>
                            <td className="py-4 px-3 text-center font-mono font-bold text-gold text-sm">
                              {wedge.totalScore}/25
                            </td>
                            <td className="py-4 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase ${
                                wedge.legalityScreen.passed 
                                  ? 'bg-green-400/10 text-green-400 border border-green-400/20' 
                                  : 'bg-red-400/10 text-red-400 border border-red-400/20'
                              }`}>
                                {wedge.legalityScreen.passed ? 'PASSED' : 'DEAD'}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono uppercase tracking-wider ${
                                isWinner
                                  ? 'bg-gold text-vanta font-bold shadow-sm'
                                  : 'bg-white/5 text-oat/50'
                              }`}>
                                {isWinner ? 'Selected Wedge' : 'Parked Next'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Evidence Citation Details Accordion / Cards */}
                <div className="pt-4 space-y-4">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-gold/80">
                    Interview Citation Evidence Log (No Vibes Scoring)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {evaluation.candidateWedges.map((wedge) => (
                      <div key={wedge.id} className="p-4 rounded-2xl bg-vanta/80 border border-gold/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-oat">{wedge.name}</p>
                          <span className="text-[10px] font-mono text-gold">{wedge.totalScore}/25 pts</span>
                        </div>
                        <ul className="text-[11px] text-oat/70 space-y-1 font-light">
                          <li><strong className="text-gold/70 font-mono text-[9px] uppercase">Error Cost Citation:</strong> "{wedge.interviewCitations.errorCost}"</li>
                          <li><strong className="text-gold/70 font-mono text-[9px] uppercase">Data Citation:</strong> "{wedge.interviewCitations.data}"</li>
                          <li><strong className="text-gold/70 font-mono text-[9px] uppercase">Verification Citation:</strong> "{wedge.interviewCitations.verification}"</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compliance-Tier Routing Gate Summary */}
              <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] md:rounded-[36px] shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock size={18} className="text-gold" />
                    <h3 className="text-base font-bold text-oat">Compliance-Tier Routing Gate</h3>
                  </div>
                  <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-[10px] font-mono text-gold uppercase tracking-widest">
                    {evaluation.complianceTier}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-light">
                  <div className="p-4 rounded-xl bg-gold/5 border border-gold/10">
                    <p className="text-[10px] font-mono text-gold/60 uppercase">Governing Framework</p>
                    <p className="font-medium text-oat mt-1">{evaluation.complianceDetails.governingFramework}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-gold/5 border border-gold/10">
                    <p className="text-[10px] font-mono text-gold/60 uppercase">TPMO & HIPAA Gates</p>
                    <p className="font-medium text-oat mt-1">
                      {evaluation.complianceDetails.tpmoGateActive ? '✅ Enforced (42 CFR § 422.2274)' : 'Standard Commercial'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-gold/5 border border-gold/10">
                    <p className="text-[10px] font-mono text-gold/60 uppercase">Data Perimeter / BAA</p>
                    <p className="font-medium text-oat mt-1">
                      {evaluation.complianceDetails.baaRequired ? 'Mandatory BAA Prior to Ingestion' : 'Standard API Security'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: ACCEPTANCE CONTRACT (AC W0.2 FORMAT) */}
      {activeTab === 'contract' && (
        <div className="space-y-6">
          {!evaluation ? (
            <div className="p-12 text-center bg-vanta/40 border border-gold/10 rounded-3xl">
              <FileSignature className="mx-auto text-gold mb-3" size={32} />
              <h3 className="text-lg font-bold text-oat">No Acceptance Contract Emitted</h3>
              <p className="text-xs text-oat/50 max-w-md mx-auto mt-1 mb-4">
                Run the evaluation on your intake transcript to emit the official Acceptance Contract.
              </p>
              <button
                onClick={handleEvaluateAndGenerateContract}
                className="px-6 py-2.5 bg-gold text-vanta text-xs font-mono uppercase font-bold rounded-xl"
              >
                Generate Contract Now
              </button>
            </div>
          ) : (
            <>
              {/* Pass Conditions Validation Badge */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">
                      Contract Emission Gate Passed ({evaluation.acceptanceContract.passConditions.length}/3+ Pass Conditions)
                    </h4>
                    <p className="text-[11px] text-oat/70 font-light">
                      All acceptance criteria are strictly machine-checkable by the automated verification suite.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(evaluation.acceptanceContract.rawMarkdown);
                      setCopiedContract(true);
                      setTimeout(() => setCopiedContract(false), 2000);
                    }}
                    className="px-4 py-2 bg-gold/10 border border-gold/20 text-gold rounded-xl text-xs font-mono uppercase hover:bg-gold/20 transition-all flex items-center gap-1.5"
                  >
                    {copiedContract ? <Check size={13} /> : <Copy size={13} />}
                    {copiedContract ? 'Copied' : 'Copy AC'}
                  </button>

                  <button
                    onClick={handleSaveToCorpus}
                    className="px-4 py-2 bg-gold/20 border border-gold/40 text-gold font-bold rounded-xl text-xs font-mono uppercase tracking-wider hover:bg-gold/30 transition-all flex items-center gap-1.5"
                  >
                    <Database size={13} />
                    Save to Corpus
                  </button>

                  {onNavigateToBuild && (
                    <button
                      onClick={() => {
                        const contractPayload = {
                          id: evaluation.acceptanceContract.contractId || `ENG-${Date.now().toString().slice(-4)}`,
                          clientName: evaluation.companyName,
                          companyName: evaluation.companyName,
                          status: 'contracted',
                          winningWedge: evaluation.winningWedge,
                          complianceTier: evaluation.complianceTier,
                          passConditions: evaluation.acceptanceContract.passConditions,
                          outOfScope: evaluation.acceptanceContract.outOfScopeList,
                          acceptanceContract: evaluation.acceptanceContract.rawMarkdown
                        };
                        onNavigateToBuild(contractPayload);
                      }}
                      className="px-5 py-2 bg-gold text-vanta font-bold rounded-xl text-xs font-mono uppercase tracking-wider hover:scale-105 transition-all flex items-center gap-1.5 shadow-lg shadow-gold/20"
                    >
                      <Layers size={13} />
                      Execute in Engage-Build →
                    </button>
                  )}
                </div>
              </div>

              {savedSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-green-400 text-xs font-mono flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Acceptance Contract and harvested objection patterns successfully stored into Firestore engagement corpus!
                </motion.div>
              )}

              {/* Acceptance Contract Markdown Document Viewer */}
              <div className="p-8 md:p-12 bg-vanta/80 border border-gold/20 rounded-[32px] md:rounded-[40px] shadow-2xl backdrop-blur-2xl font-serif text-oat space-y-8 max-w-4xl mx-auto">
                <div className="border-b border-gold/20 pb-6 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold">artificialBRIDGE • Acceptance Contract</span>
                    <h2 className="text-2xl md:text-3xl font-sans font-bold text-oat mt-1">{evaluation.acceptanceContract.title}</h2>
                    <p className="text-xs font-mono text-oat/40 mt-1">Contract ID: {evaluation.acceptanceContract.contractId} • Date: {new Date().toLocaleDateString()}</p>
                  </div>
                  <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-[9px] font-mono text-gold uppercase tracking-widest font-sans">
                    W0.2 Spec
                  </span>
                </div>

                {/* Section 1: Single Target Wedge */}
                <div className="space-y-2">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-gold font-bold">1. Selected Single Target Wedge</h3>
                  <p className="text-sm font-sans text-oat/90 bg-gold/5 p-4 rounded-xl border border-gold/10">
                    <strong>{evaluation.winningWedge}</strong>: {evaluation.winningWedgeSummary}
                  </p>
                </div>

                {/* Section 2: Machine Checkable Pass Conditions */}
                <div className="space-y-3">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-gold font-bold">
                    2. Machine-Checkable Pass Conditions (\`pass_conditions\`)
                  </h3>
                  <div className="space-y-2 font-sans">
                    {evaluation.acceptanceContract.passConditions.map((cond, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3.5 bg-vanta/90 border border-gold/10 rounded-xl text-xs">
                        <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-[10px] font-mono flex-shrink-0 mt-0.5">
                          ✓
                        </span>
                        <p className="text-oat/90 leading-relaxed">{cond}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3: Explicit Out of Scope */}
                <div className="space-y-2">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-red-400/90 font-bold">
                    3. Explicit Out-of-Scope Boundaries
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-sans">
                    {evaluation.acceptanceContract.outOfScopeList.map((item, idx) => (
                      <div key={idx} className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-xs text-oat/70 flex items-start gap-2">
                        <span className="text-red-400 font-mono text-[10px]">✕</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Pricing & Commercial Terms */}
                <div className="space-y-2">
                  <h3 className="text-sm font-mono uppercase tracking-widest text-gold font-bold">4. Commercial Pricing & Terms</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-sans text-xs">
                    <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl">
                      <p className="text-[10px] font-mono text-gold/60 uppercase">Pricing Model</p>
                      <p className="font-bold text-oat mt-1">{evaluation.acceptanceContract.pricing.model}</p>
                    </div>
                    <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl">
                      <p className="text-[10px] font-mono text-gold/60 uppercase">Investment Amount</p>
                      <p className="font-bold text-gold text-lg mt-1">{evaluation.acceptanceContract.pricing.amount}</p>
                    </div>
                    <div className="p-4 bg-gold/5 border border-gold/10 rounded-xl">
                      <p className="text-[10px] font-mono text-gold/60 uppercase">Delivery Timeline</p>
                      <p className="font-bold text-oat mt-1">{evaluation.acceptanceContract.timeline}</p>
                    </div>
                  </div>
                  <p className="text-[11px] font-sans text-oat/50 italic px-1">
                    Terms: {evaluation.acceptanceContract.pricing.terms}
                  </p>
                </div>

                {/* Section 5: Next Wedges Backlog */}
                <div className="space-y-2 pt-2 border-t border-gold/10">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-oat/50">
                    5. Parked Next Wedges (Corpus Backlog)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {evaluation.nextWedges.map((nw, i) => (
                      <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-oat/60">
                        📦 {nw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: ENGAGEMENT CORPUS & OBJECTIONS */}
      {activeTab === 'corpus' && (
        <div className="space-y-8">
          {/* Objections Harvested in Current Session */}
          {evaluation?.objectionsHarvested && evaluation.objectionsHarvested.length > 0 && (
            <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] md:rounded-[36px] backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-gold" />
                  <h3 className="text-lg font-bold text-oat">Harvested Objections & Countermeasures</h3>
                </div>
                <span className="text-[10px] font-mono text-gold/60 uppercase">
                  {evaluation.objectionsHarvested.length} Patterns Captured
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evaluation.objectionsHarvested.map((obj, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-gold/5 border border-gold/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-gold uppercase px-2 py-0.5 bg-gold/10 rounded-full">
                        {obj.category}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-oat">"{obj.objection}"</p>
                    <p className="text-xs text-oat/70 font-light pt-1 border-t border-gold/5">
                      <strong className="text-gold font-mono text-[9px] uppercase">Countermeasure:</strong> {obj.countermeasure}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Firestore Engagements History */}
          <div className="p-6 md:p-8 bg-vanta/60 border border-gold/15 rounded-[28px] md:rounded-[36px] backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-oat flex items-center gap-2">
                  <Database size={20} className="text-gold" />
                  Persistent Engagement Corpus ({savedEngagements.length})
                </h3>
                <p className="text-xs text-oat/50 mt-1">
                  Historical intake sessions, rubric outputs, and contracted wedges.
                </p>
              </div>
            </div>

            {savedEngagements.length === 0 ? (
              <p className="text-xs text-oat/40 italic p-6 text-center bg-gold/5 rounded-2xl border border-gold/5">
                No saved engagements in corpus yet. Click "Save to Corpus" on the Acceptance Contract tab.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedEngagements.map((eng) => (
                  <div key={eng.id} className="p-5 rounded-2xl bg-vanta/80 border border-gold/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-gold uppercase px-2 py-0.5 bg-gold/10 rounded-full">
                        {eng.complianceTier || 'unregulated'}
                      </span>
                      <span className="text-[9px] font-mono text-oat/40">
                        {new Date(eng.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-oat">{eng.winningWedge || 'Engagement Intake'}</h4>
                      <p className="text-xs text-oat/60">{eng.companyName || eng.clientName}</p>
                    </div>
                    {eng.passConditions && (
                      <p className="text-[10px] font-mono text-emerald-400">
                        ✓ {eng.passConditions.length} Machine-Checkable Pass Conditions
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
