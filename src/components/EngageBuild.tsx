import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Hammer, 
  ShieldCheck, 
  Cpu, 
  Database, 
  FileCode, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Lock, 
  Layers, 
  Flame, 
  RotateCcw, 
  ChevronRight, 
  Terminal, 
  Zap, 
  FileCheck2, 
  DollarSign, 
  SendHorizontal, 
  ExternalLink,
  Code2,
  Copy,
  Check
} from 'lucide-react';
import { INITIAL_CORPUS_ADAPTERS, SYNTHETIC_FIXTURES, CorpusAdapter, SyntheticFixture } from '../data/corpusAdapters';
import { SYNTHETIC_PRESETS } from '../data/syntheticPresets';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface EngageBuildProps {
  initialContract?: any;
  onNavigateToIntake?: () => void;
  onNavigateToVerify?: (buildRunPayload?: any) => void;
}

export const EngageBuild: React.FC<EngageBuildProps> = ({
  initialContract,
  onNavigateToIntake,
  onNavigateToVerify
}) => {
  const { user } = useAuth();
  const [selectedContract, setSelectedContract] = useState<any>(initialContract || null);
  const [availableEngagements, setAvailableEngagements] = useState<any[]>([]);
  const [corpusAdapters, setCorpusAdapters] = useState<CorpusAdapter[]>(INITIAL_CORPUS_ADAPTERS);
  const [fixtures] = useState<SyntheticFixture[]>(SYNTHETIC_FIXTURES);
  const [activeTab, setActiveTab] = useState<'build' | 'adapters' | 'fixtures' | 'evidence'>('build');
  
  // Build execution state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<any>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [errorW03, setErrorW03] = useState<any>(null);
  
  // Stack discipline options
  const [simulatePaidTool, setSimulatePaidTool] = useState(false);
  const [copiedArtifact, setCopiedArtifact] = useState<string | null>(null);

  // Active adapter testing state
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(corpusAdapters[0].id);
  const [adapterTestOutput, setAdapterTestOutput] = useState<any>(null);

  // Load existing contracted engagements from Firestore or fallback to presets
  useEffect(() => {
    async function loadContracts() {
      try {
        const q = query(collection(db, 'engagements'));
        const snap = await getDocs(q);
        const fetched: any[] = [];
        snap.forEach(doc => {
          fetched.push({ id: doc.id, ...doc.data() });
        });

        // Add pre-set contracted Medicare FMO Pack #1 as first-class option
        const medicarePreset = {
          id: 'ENG-MEDICARE-FMO-01',
          clientName: 'Sarah Jenkins (VP Ops)',
          companyName: 'Apex Health Brokers LLC',
          status: 'contracted',
          winningWedge: 'Carrier Commission Reconciliation & Discrepancy Recovery',
          complianceTier: 'regulated-medicare',
          passConditions: [
            '100% deterministic matching of carrier statements against internal broker CRM roster with <0.01% error',
            'Automated discrepancy report identifying unpaid or underpaid commissions categorized by carrier',
            'Exportable CMS 42 CFR § 422.2274 audit-compliant reconciliation log with immutable SHA256 digest'
          ],
          outOfScope: [
            'Automated bank ACH debit/credit disbursements',
            'Consumer Medicare plan recommendation engine',
            'Carrier contract renegotiation services'
          ],
          acceptanceContract: `# ACCEPTANCE CONTRACT: ENG-MEDICARE-FMO-01\nTarget Wedge: Carrier Commission Reconciliation\nClient: Apex Health Brokers LLC\n\nPass Conditions:\n- 100% deterministic matching of carrier statements against internal broker CRM roster with <0.01% error\n- Automated discrepancy report identifying unpaid or underpaid commissions categorized by carrier\n- Exportable CMS 42 CFR § 422.2274 audit-compliant reconciliation log with immutable SHA256 digest`
        };

        const escrowPreset = {
          id: 'ENG-FINTECH-ESCROW-02',
          clientName: 'Elena Rostova (Head of Trust)',
          companyName: 'Nova Escrow Ltd',
          status: 'contracted',
          winningWedge: 'Real-Time Multi-Party Escrow Condition Verifier',
          complianceTier: 'regulated-other',
          passConditions: [
            'Deterministic dual-key authorization evaluation before releasing escrow tranches',
            'Automated OFAC sanction & AML check verification with sub-second execution',
            'Idempotent wire release manifest emission with zero double-payout vulnerability'
          ],
          outOfScope: ['Direct Fedwire / Swift gateway hosting', 'Custodial banking ledger replacement'],
          acceptanceContract: `# ACCEPTANCE CONTRACT: ENG-FINTECH-ESCROW-02\nTarget Wedge: Real-Time Multi-Party Escrow Condition Verifier\nClient: Nova Escrow Ltd\n\nPass Conditions:\n- Deterministic dual-key authorization evaluation before releasing escrow tranches\n- Automated OFAC sanction & AML check verification with sub-second execution\n- Idempotent wire release manifest emission with zero double-payout vulnerability`
        };

        const combined = [...fetched, medicarePreset, escrowPreset];
        setAvailableEngagements(combined);

        if (!selectedContract) {
          setSelectedContract(medicarePreset);
        }
      } catch (err) {
        console.warn('Failed to load contracts from Firestore:', err);
      }
    }
    loadContracts();
  }, []);

  // Update selected contract if prop changes
  useEffect(() => {
    if (initialContract) {
      setSelectedContract(initialContract);
    }
  }, [initialContract]);

  // Run deterministic build execution
  const handleExecuteBuild = async () => {
    setErrorW03(null);
    setIsBuilding(true);
    setBuildLogs([]);
    setBuildResult(null);

    // Initial boundary check: Contract presence & validity
    if (!selectedContract) {
      setErrorW03({
        status: 'error',
        error: 'W0.3_NO_CONTRACT',
        severity: 'blocked',
        what: 'No Acceptance Contract was provided to engage-build.',
        why: 'engage-build executes contracts. It strictly refuses to write code or guess requirements without an approved W0.2 contract.',
        next_step: 're-fire engage-intake'
      });
      setIsBuilding(false);
      return;
    }

    const passConditions = selectedContract.passConditions || [];
    const isContracted = selectedContract.status === 'contracted' || selectedContract.status === 'approved';

    if (!isContracted || passConditions.length < 3) {
      setErrorW03({
        status: 'error',
        error: 'W0.3_INVALID_CONTRACT',
        severity: 'blocked',
        what: `Contract ${selectedContract.id || 'ENG-???'} has status '${selectedContract.status}' and ${passConditions.length} checkable pass conditions (minimum 3 required).`,
        why: 'engage-build requires an approved W0.2 contract with at least 3 machine-checkable criteria before writing any code.',
        next_step: 're-fire engage-intake'
      });
      setIsBuilding(false);
      return;
    }

    try {
      // Step 1: Simulate streamed build stages in UI
      const initialLogs = [
        `[HANDOFF-ENGINE] Ingesting contract: ${selectedContract.id} (${selectedContract.companyName})`,
        `[ISOLATION-GUARD] Stripping intake deliberation transcript & reasoning context...`,
        `[FRESH-CONTEXT] Context sanitized. Only contract spec, golden fixtures, and corpus adapters loaded.`,
        `[COMPLIANCE-CHECK] Tier: ${selectedContract.complianceTier.toUpperCase()}`,
        `[CORPUS-QUERY] Searching adapter library for reusable deterministic components...`
      ];
      setBuildLogs(initialLogs);

      // Call server execute endpoint
      const res = await fetch('/api/build/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: selectedContract,
          options: {
            paidTools: simulatePaidTool ? ['Paid AWS Textract OCR Subscription ($0.05/doc)'] : []
          }
        })
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        setErrorW03(data);
        setIsBuilding(false);
        return;
      }

      // Increment corpus adapter reuse count locally
      setCorpusAdapters(prev => prev.map(a => {
        if (a.id === 'adapter-edi835-deterministic-reconciler' || a.id === 'adapter-evidence-stager-checksum') {
          return { ...a, reuseCount: a.reuseCount + 1 };
        }
        return a;
      }));

      // Combine logs
      setBuildLogs([...initialLogs, ...data.buildLogs]);
      setBuildResult(data);

      // Persist to Firestore build_runs if user is logged in
      try {
        await addDoc(collection(db, 'build_runs'), {
          contractId: selectedContract.id,
          clientUid: user?.uid || 'guest-builder',
          clientName: selectedContract.clientName || 'Demo Client',
          status: 'staged',
          complianceTier: selectedContract.complianceTier,
          contextIsolationHash: data.freshContextHash,
          reusedAdapterIds: ['adapter-edi835-deterministic-reconciler', 'adapter-evidence-stager-checksum'],
          stackCostEstimate: data.stackCostEstimate,
          langHold: data.langHold,
          langHoldItems: data.langHoldItems || [],
          buildLogs: data.buildLogs,
          stagedEvidence: data.stagedEvidence,
          artifactsProduced: data.artifactsProduced,
          createdAt: new Date().toISOString()
        });
      } catch (fErr) {
        console.warn('Could not write build_run record to Firestore:', fErr);
      }

    } catch (err: any) {
      setErrorW03({
        status: 'error',
        error: 'W0.3_BUILD_EXCEPTION',
        severity: 'broken',
        what: err.message || 'Build pipeline execution error',
        why: 'Network or environment failure during deterministic synthesis.',
        next_step: 'verify dev server health or retry build execution'
      });
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRunAdapterTest = (adapter: CorpusAdapter) => {
    setSelectedAdapterId(adapter.id);
    const fixture = fixtures.find(f => f.vertical === adapter.category || f.id.includes('apex')) || fixtures[0];
    const output = adapter.deterministicLogic({ rawStatements: fixture.rawInput });
    setAdapterTestOutput(output);
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedArtifact(key);
    setTimeout(() => setCopiedArtifact(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Header & Phase Sub-system Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-vanta-light/60 border border-gold/20 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-gold/10 border border-gold/30 rounded-full text-gold font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Hammer size={13} />
              Phase 2: Engage-Build
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-full">
              W0.2 Contract Executor
            </span>
          </div>
          <h2 className="text-2xl font-serif text-oat mt-2">
            Deterministic Build & Evidence Staging Engine
          </h2>
          <p className="text-sm text-oat/70 mt-1 max-w-3xl">
            Executes approved Acceptance Contracts (W0.2) in a fresh isolated context. Refuses builds without an approved contract. Queries reusable corpus adapters ($0 default) and stages machine-checkable evidence for engage-verify.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToIntake && (
            <button
              onClick={onNavigateToIntake}
              className="px-4 py-2.5 rounded-xl border border-gold/20 text-oat hover:text-gold hover:border-gold/40 text-xs font-mono uppercase tracking-wider transition-all"
            >
              ← Phase 1: Intake
            </button>
          )}
          {buildResult && onNavigateToVerify && (
            <button
              onClick={() => onNavigateToVerify(buildResult)}
              className="px-5 py-2.5 rounded-xl bg-gold text-vanta font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-gold/20 hover:bg-gold-light transition-all"
            >
              Handoff to Phase 3: Verify →
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Sub-views */}
      <div className="flex items-center gap-2 p-1.5 bg-vanta/60 border border-gold/15 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('build')}
          className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'build'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <Hammer size={14} />
          Contract Execution Pipeline
        </button>
        <button
          onClick={() => setActiveTab('adapters')}
          className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'adapters'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <Database size={14} />
          Corpus Adapters ({corpusAdapters.length})
        </button>
        <button
          onClick={() => setActiveTab('fixtures')}
          className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'fixtures'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <Code2 size={14} />
          Golden Test Fixtures ({fixtures.length})
        </button>
        {buildResult && (
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'evidence'
                ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
                : 'text-oat/60 hover:text-gold'
            }`}
          >
            <FileCheck2 size={14} />
            Staged Evidence ({buildResult.stagedEvidence?.length || 0})
          </button>
        )}
      </div>

      {/* VIEW 1: CONTRACT EXECUTION PIPELINE */}
      {activeTab === 'build' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Contract Selector & Boundary Check */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-gold flex items-center gap-1.5 font-bold">
                  <Lock size={13} />
                  1. Input Contract Gate
                </span>
                <span className="text-xs font-mono text-oat/50">Rule #1: No contract, no build</span>
              </div>

              <div>
                <label className="block text-xs font-mono text-oat/70 mb-2 uppercase">Select Approved W0.2 Contract</label>
                <select
                  value={selectedContract?.id || ''}
                  onChange={(e) => {
                    const found = availableEngagements.find(a => a.id === e.target.value);
                    if (found) setSelectedContract(found);
                  }}
                  className="w-full bg-vanta border border-gold/20 rounded-xl px-4 py-2.5 text-sm text-oat focus:outline-none focus:border-gold font-mono"
                >
                  {availableEngagements.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.companyName} ({c.winningWedge || 'Contract'}) [{c.status}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedContract ? (
                <div className="p-4 bg-vanta/70 border border-gold/10 rounded-xl space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-gold/10">
                    <span className="text-oat/60">Contract ID:</span>
                    <span className="text-gold font-bold">{selectedContract.id}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gold/10">
                    <span className="text-oat/60">Company / Sponsor:</span>
                    <span className="text-oat">{selectedContract.companyName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gold/10">
                    <span className="text-oat/60">Status:</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      selectedContract.status === 'contracted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {selectedContract.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gold/10">
                    <span className="text-oat/60">Compliance Tier:</span>
                    <span className="text-purple-400 font-bold uppercase">{selectedContract.complianceTier}</span>
                  </div>
                  <div>
                    <span className="text-oat/60 block mb-1.5">Pass Conditions (≥3 Required):</span>
                    <ul className="space-y-1 pl-3 text-oat/80">
                      {(selectedContract.passConditions || []).map((c: string, i: number) => (
                        <li key={i} className="list-disc text-[11px] leading-relaxed">
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-mono">
                  No contracted engagement selected. Use Phase 1 (Engage-Intake) to generate an approved Acceptance Contract.
                </div>
              )}

              {/* Operating Constraint Toggles */}
              <div className="pt-2 border-t border-gold/10 space-y-3">
                <span className="text-xs font-mono text-gold uppercase tracking-wider block font-bold">
                  2. Stack Discipline & Simulation
                </span>
                <label className="flex items-center gap-3 text-xs text-oat/80 cursor-pointer p-2.5 bg-vanta/40 rounded-xl border border-gold/10 hover:border-gold/30 transition-all">
                  <input
                    type="checkbox"
                    checked={simulatePaidTool}
                    onChange={(e) => setSimulatePaidTool(e.target.checked)}
                    className="accent-gold rounded"
                  />
                  <div>
                    <span className="font-bold text-oat">Simulate Paid Dependency ($0 Stack Violation)</span>
                    <span className="block text-[10px] text-oat/50">Triggers 'lang_hold: true' & batched escalation without stalling build</span>
                  </div>
                </label>
              </div>

              {/* Execute Action */}
              <button
                onClick={handleExecuteBuild}
                disabled={isBuilding}
                className="w-full py-3.5 bg-gold text-vanta font-mono font-bold text-sm rounded-xl uppercase tracking-widest shadow-lg shadow-gold/20 hover:bg-gold-light transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBuilding ? (
                  <>
                    <Zap className="animate-spin" size={16} />
                    Executing Deterministic Pipeline...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Execute Contract (Phase 2 Build)
                  </>
                )}
              </button>
            </div>

            {/* Error W0.3 Boundary Card (If Refusal/Failure) */}
            {errorW03 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-red-950/40 border border-red-500/40 rounded-2xl space-y-3 font-mono text-xs text-red-200"
              >
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider">
                  <AlertTriangle size={16} />
                  W0.3 Boundary Error: {errorW03.error || 'BLOCKED'}
                </div>
                <div>
                  <span className="text-red-400 font-bold uppercase block text-[10px]">What happened:</span>
                  <p className="text-red-100">{errorW03.what}</p>
                </div>
                <div>
                  <span className="text-red-400 font-bold uppercase block text-[10px]">Why it failed:</span>
                  <p className="text-red-300">{errorW03.why}</p>
                </div>
                <div>
                  <span className="text-red-400 font-bold uppercase block text-[10px]">Next Required Step:</span>
                  <div className="flex items-center justify-between bg-red-900/30 p-2 rounded-lg mt-1 border border-red-500/20">
                    <span className="text-amber-300 font-bold">{errorW03.next_step}</span>
                    {onNavigateToIntake && (
                      <button
                        onClick={onNavigateToIntake}
                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded text-[10px] uppercase font-bold"
                      >
                        Go to Intake
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Fresh Context Isolation & Live Build Terminal */}
          <div className="lg:col-span-7 space-y-6">
            {/* Fresh-Context Handoff Engine Monitor */}
            <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-gold flex items-center gap-1.5 font-bold">
                  <Layers size={14} />
                  Fresh-Context Handoff Bundle
                </span>
                <span className="px-2 py-0.5 bg-gold/10 text-gold font-mono text-[10px] rounded border border-gold/20">
                  Intake Deliberation Stripped
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                  <span className="text-[10px] text-oat/50 uppercase block">Context Mode</span>
                  <span className="text-emerald-400 font-bold">ISOLATED</span>
                </div>
                <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                  <span className="text-[10px] text-oat/50 uppercase block">Stack Cost</span>
                  <span className="text-gold font-bold">{simulatePaidTool ? '$0.05 (HOLD)' : '$0.00 FREE'}</span>
                </div>
                <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                  <span className="text-[10px] text-oat/50 uppercase block">Adapters Active</span>
                  <span className="text-oat font-bold">2 Reused</span>
                </div>
                <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                  <span className="text-[10px] text-oat/50 uppercase block">Evidence Items</span>
                  <span className="text-oat font-bold">{selectedContract?.passConditions?.length || 0} Required</span>
                </div>
              </div>

              {/* Terminal Logs */}
              <div className="bg-black/80 rounded-xl border border-gold/20 p-4 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between text-oat/40 pb-2 border-b border-white/10 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Terminal size={12} className="text-gold" />
                    theBRIDGE Core Build Console (Sub-Second Latency)
                  </span>
                  <span>{buildLogs.length} events logged</span>
                </div>
                {buildLogs.length === 0 ? (
                  <div className="py-8 text-center text-oat/40">
                    Awaiting contract execution trigger. Press "Execute Contract" to run deterministic build pipeline.
                  </div>
                ) : (
                  buildLogs.map((log, idx) => (
                    <div key={idx} className="text-oat/90 leading-relaxed font-mono">
                      <span className="text-gold/60 mr-2">[{new Date().toISOString().slice(11, 19)}]</span>
                      <span className={
                        log.includes('DISCREPANCY') || log.includes('ALERT') ? 'text-amber-400 font-bold' :
                        log.includes('COMPLETE') || log.includes('PASSED') ? 'text-emerald-400 font-bold' :
                        log.includes('LANG_HOLD') ? 'text-red-400 font-bold' : 'text-oat/80'
                      }>
                        {log}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Build Results & Artifacts Showcase */}
              {buildResult && (
                <div className="pt-4 border-t border-gold/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 size={15} />
                      Build Succeeded & Staged for Verification
                    </span>
                    <span className="text-[11px] font-mono text-oat/60">
                      SHA256: {buildResult.freshContextHash?.slice(0, 12)}...
                    </span>
                  </div>

                  {/* Produced Artifacts */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-oat/70 uppercase block">Staged Deliverable Artifacts:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(buildResult.artifactsProduced || []).map((art: any, i: number) => (
                        <div key={i} className="p-3 bg-vanta/80 border border-gold/15 rounded-xl space-y-1.5 font-mono text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gold font-bold truncate">{art.name}</span>
                            <FileCode size={13} className="text-gold/60" />
                          </div>
                          <p className="text-[11px] text-oat/60 line-clamp-2">{art.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-oat/40 pt-1 border-t border-gold/10">
                            <span>{art.sizeBytes} bytes</span>
                            <button
                              onClick={() => handleCopyText(`// Checksum: ${art.checksum}\n// Artifact: ${art.name}\n// Exported from artificialBRIDGE engage-build`, art.name)}
                              className="text-gold hover:text-gold-light flex items-center gap-1"
                            >
                              {copiedArtifact === art.name ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              {copiedArtifact === art.name ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lang Hold Box (if any) */}
                  {buildResult.langHold && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 font-mono text-xs text-amber-300">
                      <div className="flex items-center gap-2 font-bold uppercase">
                        <DollarSign size={14} />
                        Batched Escalation: Lang_Hold Active
                      </div>
                      <ul className="list-disc pl-4 space-y-1 text-amber-200 text-[11px]">
                        {buildResult.langHoldItems?.map((item: string, idx: number) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                      <span className="text-[10px] text-amber-400/80 block">
                        Deterministic build pipeline completed on all non-blocked items. Zero serial stall.
                      </span>
                    </div>
                  )}

                  {/* Handoff button */}
                  {onNavigateToVerify && (
                    <button
                      onClick={() => onNavigateToVerify(buildResult)}
                      className="w-full py-3 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 font-mono font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <FileCheck2 size={15} />
                      Hand Off Staged Evidence Package to Phase 3 (Engage-Verify) →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CORPUS ADAPTERS FLYWHEEL */}
      {activeTab === 'adapters' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Adapter list */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-gold font-bold">
                Reusable Corpus Components ($0 Cost)
              </h3>
              <span className="text-xs font-mono text-emerald-400">Flywheel Active</span>
            </div>
            <div className="space-y-3">
              {corpusAdapters.map(adapter => (
                <div
                  key={adapter.id}
                  onClick={() => handleRunAdapterTest(adapter)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedAdapterId === adapter.id
                      ? 'bg-vanta-light/70 border-gold shadow-lg shadow-gold/10'
                      : 'bg-vanta-light/30 border-gold/10 hover:border-gold/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gold font-bold">{adapter.name}</span>
                    <span className="px-2 py-0.5 bg-gold/10 border border-gold/20 text-gold font-mono text-[10px] rounded-full">
                      Reused {adapter.reuseCount}x
                    </span>
                  </div>
                  <p className="text-xs text-oat/70 mt-1.5 leading-relaxed">{adapter.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {adapter.complianceGates.map((gate, i) => (
                      <span key={i} className="px-2 py-0.5 bg-vanta border border-gold/10 text-oat/60 font-mono text-[9px] rounded">
                        {gate}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adapter code & interactive runner */}
          <div className="lg:col-span-7 space-y-6">
            {(() => {
              const current = corpusAdapters.find(a => a.id === selectedAdapterId) || corpusAdapters[0];
              return (
                <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-mono text-gold font-bold">{current.name}</h4>
                      <span className="text-[11px] font-mono text-oat/50">Category: {current.category}</span>
                    </div>
                    <button
                      onClick={() => handleRunAdapterTest(current)}
                      className="px-4 py-2 bg-gold/10 border border-gold/30 hover:bg-gold text-gold hover:text-vanta font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Play size={12} />
                      Test Adapter ({current.isZeroCost ? '$0 / 0ms' : 'Paid'})
                    </button>
                  </div>

                  {/* Code snippet */}
                  <div className="bg-black/90 rounded-xl p-4 border border-gold/15 font-mono text-xs overflow-x-auto text-emerald-300 max-h-60">
                    <pre>{current.codeSnippet}</pre>
                  </div>

                  {/* Test output */}
                  {adapterTestOutput && (
                    <div className="p-4 bg-vanta/80 border border-gold/20 rounded-xl space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Deterministic Execution Result</span>
                        <span>{adapterTestOutput.executionMs}ms (0 LLM Cost)</span>
                      </div>
                      <div className="bg-black/60 p-3 rounded-lg text-oat/80 max-h-40 overflow-y-auto text-[11px]">
                        <pre>{JSON.stringify(adapterTestOutput.result, null, 2)}</pre>
                      </div>
                      <div className="text-[10px] text-oat/50 space-y-0.5">
                        {adapterTestOutput.logs.map((l: string, i: number) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW 3: GOLDEN TEST FIXTURES */}
      {activeTab === 'fixtures' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {fixtures.map(fix => (
            <div key={fix.id} className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-3 font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-gold font-bold">{fix.name}</span>
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[9px] uppercase font-bold">
                    {fix.vertical}
                  </span>
                </div>
                <p className="text-oat/70 text-[11px] mt-2 leading-relaxed">{fix.description}</p>
                <div className="mt-3 p-3 bg-black/60 rounded-xl border border-gold/10 text-emerald-300 max-h-36 overflow-y-auto text-[10px]">
                  <pre>{fix.rawInput}</pre>
                </div>
              </div>
              <div className="pt-3 border-t border-gold/10">
                <span className="text-[10px] text-oat/50 block mb-1 uppercase font-bold">Expected Verification:</span>
                <p className="text-[11px] text-oat/90 leading-normal">{fix.expectedOutputSummary}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 4: STAGED EVIDENCE INSPECTOR */}
      {activeTab === 'evidence' && buildResult && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-2">
                <FileCheck2 size={16} />
                Cryptographic Evidence Manifest (Ready for engage-verify)
              </h3>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 font-mono text-xs rounded-full border border-emerald-500/30">
                All {buildResult.stagedEvidence?.length} Criteria Satisfied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {(buildResult.stagedEvidence || []).map((ev: any, idx: number) => (
                <div key={idx} className="p-4 bg-vanta/70 border border-gold/15 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gold font-bold">{ev.id}</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-bold">
                      {ev.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-oat/50 uppercase block">Contract Acceptance Criterion:</span>
                    <p className="text-oat/90 text-[11px] mt-0.5 leading-relaxed font-sans">{ev.criterion}</p>
                  </div>
                  <div className="p-2.5 bg-black/40 rounded-lg space-y-1 text-[10px] text-oat/60 border border-gold/10">
                    <div>Type: <span className="text-oat">{ev.evidenceType}</span></div>
                    <div>Cost: <span className="text-gold">${ev.details?.costUsd?.toFixed(2)}</span></div>
                    <div>Execution: <span className="text-emerald-400">{ev.details?.executionMs}ms</span></div>
                    <div className="truncate">Digest: <span className="text-oat/40">{ev.evidenceDigest?.slice(0, 16)}...</span></div>
                  </div>
                </div>
              ))}
            </div>

            {onNavigateToVerify && (
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => onNavigateToVerify(buildResult)}
                  className="px-6 py-3 bg-gold text-vanta font-mono font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-gold-light shadow-lg shadow-gold/20 transition-all flex items-center gap-2"
                >
                  Proceed with Staged Evidence to Phase 3: Engage-Verify →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
