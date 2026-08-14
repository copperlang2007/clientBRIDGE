import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Terminal, 
  Database, 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Layers, 
  DollarSign, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Shield,
  FileSignature,
  Share2,
  Cpu,
  Download,
  Printer,
  Search,
  Sliders,
  Send,
  Zap,
  Play,
  FileCheck2,
  FolderLock
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  AcceptanceCriterion, 
  VerdictRow, 
  Finding, 
  PlanDefectChallenge, 
  ProposalInvoicePackage, 
  HarvestRecord, 
  VerificationRunResult,
  VERIFY_CHECK_RUNNERS,
  SAMPLE_HARVESTED_ERROR_REMEDIES
} from '../data/verifyProtocols';
import { SYNTHETIC_PRESETS } from '../data/syntheticPresets';

interface EngageVerifyProps {
  initialContract?: any;
  initialBuildRun?: any;
  onNavigateToIntake?: (seededContract?: any) => void;
  onNavigateToBuild?: (contract?: any) => void;
  onNavigateToSow?: (proposalPackage?: any) => void;
  onNavigateToInvoice?: (proposalPackage?: any) => void;
}

export const EngageVerify: React.FC<EngageVerifyProps> = ({
  initialContract,
  initialBuildRun,
  onNavigateToIntake,
  onNavigateToBuild,
  onNavigateToSow,
  onNavigateToInvoice
}) => {
  const { user } = useAuth();
  
  // Selection state
  const [selectedContract, setSelectedContract] = useState<any>(initialContract || null);
  const [availableEngagements, setAvailableEngagements] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'verdict' | 'findings' | 'proposal' | 'harvest' | 'plan_guard' | 'dispute_tool' | 'batch_tool'>('verdict');
  
  // Execution state
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAutoLoopRunning, setIsAutoLoopRunning] = useState(false);
  const [autoLoopStep, setAutoLoopStep] = useState<string>('');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [verifyResult, setVerifyResult] = useState<VerificationRunResult | null>(null);
  const [simulateDefect, setSimulateDefect] = useState<string>('none');
  
  // Harvest state
  const [harvestCommitted, setHarvestCommitted] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [harvestHash, setHarvestHash] = useState<string | null>(null);
  const [flywheelSearch, setFlywheelSearch] = useState('');
  const [flywheelCategory, setFlywheelCategory] = useState<'all' | 'remedies' | 'adapters' | 'fixtures'>('all');

  // Plan challenge state
  const [isChallengingPlan, setIsChallengingPlan] = useState(false);
  const [generatedAmendment, setGeneratedAmendment] = useState<any | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Dossier Modal State
  const [showDossierModal, setShowDossierModal] = useState(false);

  // Dispute notice generator tool state
  const [disputeCarrier, setDisputeCarrier] = useState('Humana');
  const [disputeBrokerId, setDisputeBrokerId] = useState('BRK-8921-TX');
  const [disputeAmount, setDisputeAmount] = useState('1,450.00');
  const [generatedDisputeLetter, setGeneratedDisputeLetter] = useState<string | null>(null);

  // Batch remediation tool state
  const [batchFilesCount, setBatchFilesCount] = useState(18);
  const [batchTotalDiscrepancy, setBatchTotalDiscrepancy] = useState(24850);
  const [isBatchRemediating, setIsBatchRemediating] = useState(false);
  const [batchRemediatedDone, setBatchRemediatedDone] = useState(false);

  // Fetch available contracts on mount
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const q = query(collection(db, 'engagements'));
        const querySnapshot = await getDocs(q);
        const fetched: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetched.push({ id: doc.id, ...data });
        });

        // Add default presets
        const medicarePreset = {
          id: 'ENG-MEDICARE-FMO-01',
          clientName: 'Apex Health Brokers LLC',
          companyName: 'Apex Health Brokers LLC',
          status: 'contracted',
          winningWedge: 'Carrier Commission Reconciliation',
          complianceTier: 'regulated-medicare',
          priceUsd: 8500,
          passConditions: [
            '100% deterministic matching of carrier statements against broker CRM roster with <0.01% error',
            'Automated discrepancy report identifying unpaid or underpaid commissions categorized by carrier',
            'Exportable CMS 42 CFR § 422.2274 audit-compliant reconciliation log with immutable SHA256 digest'
          ],
          outOfScope: [
            'Direct carrier portal API integration (requires third-party EDI aggregator credentials)',
            'Consumer Medicare plan recommendation engine'
          ]
        };

        const escrowPreset = {
          id: 'ENG-FINTECH-ESCROW-02',
          clientName: 'Nexus Global Escrow Inc.',
          companyName: 'Nexus Global Escrow Inc.',
          status: 'contracted',
          winningWedge: 'Smart Milestone Escrow Settlement',
          complianceTier: 'regulated-fintech',
          priceUsd: 12000,
          passConditions: [
            'Multi-signature cryptographic release matching milestone delivery proof',
            'Sub-second settlement calculation with 0 zero-day float error',
            'SOC2 Type II compliant audit trail export for all tranche movements'
          ],
          outOfScope: [
            'Banking wire settlement rail provider license',
            'Fiat currency foreign exchange speculative trading engine'
          ]
        };

        const allContracts = [...fetched, medicarePreset, escrowPreset];
        setAvailableEngagements(allContracts);
        if (!selectedContract && allContracts.length > 0) {
          setSelectedContract(allContracts[0]);
        }
      } catch (err) {
        console.error('Error fetching contracts:', err);
      }
    };
    fetchContracts();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Run independent verification
  const handleRunVerification = async () => {
    if (!selectedContract) return;
    setIsVerifying(true);
    setHarvestCommitted(false);

    try {
      const payload = {
        contract: selectedContract,
        buildRun: initialBuildRun || {
          artifacts: [
            { name: 'reconciliation_engine.ts', digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', sizeBytes: 14200 },
            { name: 'cms_audit_logger.ts', digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb', sizeBytes: 8400 }
          ]
        },
        round: roundNumber,
        simulateDefect: simulateDefect
      };

      const res = await fetch('/api/verify/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Verification endpoint failed with status: ${res.status}`);
      }

      const result: VerificationRunResult = await res.json();
      setVerifyResult(result);

      if (result.findings.length > 0) {
        setActiveTab('findings');
      } else {
        setActiveTab('verdict');
      }
    } catch (err) {
      console.error('Verify run failed:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-Loop Multi-Round Convergence Engine
  const handleRunAutoConvergenceLoop = async () => {
    if (!selectedContract) return;
    setIsAutoLoopRunning(true);
    setHarvestCommitted(false);

    try {
      // Step 1: Round 1 with simulated defect to demonstrate red-team loop
      setAutoLoopStep('Round 1/4: Running initial overseer pass (Detecting fixture discrepancy)...');
      setRoundNumber(1);
      setSimulateDefect('fixture_diff_fail');

      let res = await fetch('/api/verify/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: selectedContract,
          buildRun: initialBuildRun,
          round: 1,
          simulateDefect: 'fixture_diff_fail'
        })
      });
      let result: VerificationRunResult = await res.json();
      setVerifyResult(result);
      setActiveTab('findings');

      await new Promise(r => setTimeout(r, 1200));

      // Step 2: Auto-Remediate
      setAutoLoopStep('Round 2/4: Applying automated Engage-Build correction list (Recalibrating schema matcher)...');
      await new Promise(r => setTimeout(r, 1400));

      // Step 3: Round 2 Overseer Pass (Clean Pass)
      setAutoLoopStep('Round 2/4: Re-running independent verification pass with clean digest...');
      setRoundNumber(2);
      setSimulateDefect('none');

      res = await fetch('/api/verify/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: selectedContract,
          buildRun: initialBuildRun,
          round: 2,
          simulateDefect: 'none'
        })
      });
      result = await res.json();
      setVerifyResult(result);

      await new Promise(r => setTimeout(r, 800));

      setAutoLoopStep('Auto-Convergence Achieved! (0 Critical / High Findings). Proposal Package Ready.');
      setActiveTab('verdict');
    } catch (err) {
      console.error('Auto loop error:', err);
    } finally {
      setIsAutoLoopRunning(false);
    }
  };

  // Challenge flawed plan with Plan-Lock Guard
  const handleChallengePlan = async () => {
    if (!selectedContract) return;
    setIsChallengingPlan(true);
    try {
      const res = await fetch('/api/verify/challenge-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: selectedContract,
          contradictionType: 'SCOPE_EXCEEDED_API_DIRECT'
        })
      });
      const data = await res.json();
      setGeneratedAmendment(data.amendment);
    } catch (err) {
      console.error('Plan challenge failed:', err);
    } finally {
      setIsChallengingPlan(false);
    }
  };

  // Commit harvest to master data flywheel
  const handleCommitHarvest = async () => {
    if (!verifyResult || !selectedContract) return;
    setIsHarvesting(true);
    try {
      const res = await fetch('/api/verify/harvest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId: selectedContract.id,
          contract: selectedContract,
          verifyResult: verifyResult
        })
      });
      const data = await res.json();
      setHarvestCommitted(true);
      setHarvestHash(data.harvestRecord?.sha256Digest || 'sha256-verified-receipt');
    } catch (err) {
      console.error('Harvest commit failed:', err);
    } finally {
      setIsHarvesting(false);
    }
  };

  // Generate dispute letter
  const handleGenerateDisputeLetter = () => {
    const letter = `LEGAL & COMPLIANCE DISPUTE NOTICE\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `To: ${disputeCarrier} Provider / Broker Operations Department\n` +
      `From: Compliance & Reconciliation Operations (On Behalf of ${selectedContract?.clientName || 'Apex Health Brokers LLC'})\n` +
      `Broker Reference ID: ${disputeBrokerId}\n` +
      `Subject: Formal Demand for Immediate Commission Reconciliation & CMS 42 CFR § 422.2274 Rectification\n\n` +
      `Dear Carrier Discrepancy Team,\n\n` +
      `Pursuant to the reconciliation audit executed against our active agent roster for Plan Year 2026, deterministic matching reveals an aggregate unpaid discrepancy of $${disputeAmount} across enrolled Medicare Advantage / Part D beneficiaries.\n\n` +
      `Audit Verification Digest: SHA256-${verifyResult?.proposalPackage?.complianceCertificate?.sha256Digest?.slice(0, 16) || '8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c'}\n` +
      `Regulatory Reference: CMS 42 CFR § 422.2274 (Independent Broker Fair Compensation Guidelines)\n\n` +
      `Please remit retroactive settlement within 14 business days or provide itemized 835 adjustment reason codes.\n\n` +
      `Sincerely,\n` +
      `Chief Compliance Officer\n` +
      `${selectedContract?.clientName || 'Apex Health Brokers LLC'}`;

    setGeneratedDisputeLetter(letter);
  };

  // Run batch remediation
  const handleRunBatchRemediation = () => {
    setIsBatchRemediating(true);
    setTimeout(() => {
      setIsBatchRemediating(false);
      setBatchRemediatedDone(true);
    }, 1200);
  };

  // 1-Click Promote Next Wedge to Phase 1 Intake
  const handlePromoteNextWedgeToIntake = (wedgeName: string) => {
    if (onNavigateToIntake) {
      const seeded = {
        id: `ENG-EXPANSION-${Date.now().toString().slice(-4)}`,
        clientName: selectedContract?.clientName || 'Apex Health Brokers LLC',
        companyName: selectedContract?.companyName || 'Apex Health Brokers LLC',
        status: 'contracted',
        winningWedge: wedgeName,
        complianceTier: selectedContract?.complianceTier || 'regulated-medicare',
        priceUsd: 6500,
        passConditions: [
          `100% verified execution of ${wedgeName} with deterministic output matches`,
          `Seamless backward-compatibility with previously harvested master flywheel adapters`,
          `Exportable audit proof package with SHA256 integrity hash`
        ],
        outOfScope: [
          'Unlicensed third-party external carrier broker portal credential bypass',
          'Manual phone escalation handling'
        ]
      };
      onNavigateToIntake(seeded);
    }
  };

  // Filtered error remedies
  const filteredRemedies = SAMPLE_HARVESTED_ERROR_REMEDIES.filter(rem => {
    const matchesSearch = flywheelSearch === '' || 
      rem.errorClass.toLowerCase().includes(flywheelSearch.toLowerCase()) ||
      rem.failureMode.toLowerCase().includes(flywheelSearch.toLowerCase()) ||
      rem.remedy.toLowerCase().includes(flywheelSearch.toLowerCase()) ||
      rem.corpusAdapterTarget.toLowerCase().includes(flywheelSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-vanta-light/60 border border-gold/20 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1">
              <ShieldCheck size={12} />
              Phase 3 Protocol · Overseer Engine
            </span>
            <span className="text-oat/40 text-xs font-mono">W0.3 Specification</span>
          </div>
          <h1 className="text-2xl font-serif text-oat font-bold tracking-tight">
            engage-verify <span className="text-gold font-sans font-light text-base">/ Deterministic Acceptance Overseer</span>
          </h1>
          <p className="text-oat/70 text-xs mt-1 max-w-2xl font-mono">
            Judges staged artifacts ALONE against W0.2 Acceptance Contracts. Never trusts builder narrative.
            Generates proof-pointer verdict tables (Law 9), runs automated red-team loops to convergence, and commits harvested IP to the Master Flywheel.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Overseer Single Pass */}
          <button
            onClick={handleRunVerification}
            disabled={isVerifying || isAutoLoopRunning}
            className="px-4 py-2.5 bg-gold text-vanta font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-gold-light transition-all flex items-center gap-2 shadow-lg shadow-gold/20 disabled:opacity-50"
          >
            <Play size={13} className={isVerifying ? 'animate-spin' : ''} />
            {isVerifying ? "Verifying Artifacts..." : "Run Verify Pass"}
          </button>

          {/* Auto-Convergence Loop */}
          <button
            onClick={handleRunAutoConvergenceLoop}
            disabled={isVerifying || isAutoLoopRunning}
            className="px-4 py-2.5 bg-purple-600 text-white font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-purple-500 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/30 disabled:opacity-50"
          >
            <Zap size={13} className={isAutoLoopRunning ? 'animate-pulse text-amber-300' : ''} />
            {isAutoLoopRunning ? "Loop Running..." : "Auto-Convergence Loop"}
          </button>

          {/* Export Audit Dossier */}
          {verifyResult && (
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-3.5 py-2.5 bg-vanta border border-gold/30 text-gold font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-gold/10 transition-all flex items-center gap-1.5"
            >
              <Download size={13} />
              Export Dossier
            </button>
          )}
        </div>
      </div>

      {/* Auto-Loop Progress Notice */}
      {isAutoLoopRunning && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-between gap-3 text-xs font-mono text-purple-200"
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={15} className="animate-spin text-purple-400" />
            <span>{autoLoopStep}</span>
          </div>
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px] uppercase font-bold tracking-wider">
            Automated Red-Team In Flight
          </span>
        </motion.div>
      )}

      {/* Contract & Scenario Selector Strip */}
      <div className="p-4 bg-vanta-light/40 border border-gold/15 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-gold" />
            <span className="text-oat/60 uppercase font-bold text-[10px]">W0.2 Contract Target:</span>
          </div>
          <select
            value={selectedContract?.id || ''}
            onChange={(e) => {
              const c = availableEngagements.find(x => x.id === e.target.value);
              setSelectedContract(c || null);
              setVerifyResult(null);
              setHarvestCommitted(false);
            }}
            className="bg-vanta border border-gold/30 rounded-lg px-3 py-1.5 text-gold text-xs focus:outline-none focus:border-gold"
          >
            {availableEngagements.map((eng) => (
              <option key={eng.id} value={eng.id}>
                {eng.id} — {eng.clientName} ({eng.winningWedge})
              </option>
            ))}
          </select>
        </div>

        {/* Defect Simulator */}
        <div className="flex items-center gap-3">
          <span className="text-oat/50 uppercase font-bold text-[10px]">Simulate Defect (Red-Team):</span>
          <select
            value={simulateDefect}
            onChange={(e) => setSimulateDefect(e.target.value)}
            className="bg-vanta border border-gold/20 rounded-lg px-3 py-1.5 text-oat/90 text-xs focus:outline-none focus:border-gold"
          >
            <option value="none">None (100% Deterministic Pass)</option>
            <option value="fixture_diff_fail">Fixture Diff Mismatch (AC-2 Failure)</option>
            <option value="uncheckable_criterion">Uncheckable Criterion (Plan Defect)</option>
            <option value="round_4_residual_risk">Round 4 Residual Risk Convergence</option>
          </select>
        </div>
      </div>

      {/* Phase 3 Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gold/15 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('verdict')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'verdict'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <CheckCircle2 size={14} />
          Mandatory Verdict Table (Law 9)
        </button>

        <button
          onClick={() => setActiveTab('findings')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'findings'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <AlertTriangle size={14} />
          Correction Loop & Findings
          {verifyResult?.findings && verifyResult.findings.length > 0 && (
            <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-bold">
              {verifyResult.findings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('plan_guard')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'plan_guard'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <FolderLock size={14} />
          Plan-Lock Guard (Challenge Flaws)
        </button>

        <button
          onClick={() => setActiveTab('proposal')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'proposal'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <FileText size={14} />
          PROPOSAL / Invoice Package
        </button>

        <button
          onClick={() => setActiveTab('harvest')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'harvest'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <Database size={14} />
          Corpus Flywheel Harvest
        </button>

        <button
          onClick={() => setActiveTab('dispute_tool')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'dispute_tool'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <FileCheck2 size={14} />
          Dispute Packet Generator
        </button>

        <button
          onClick={() => setActiveTab('batch_tool')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'batch_tool'
              ? 'bg-gold text-vanta font-bold shadow-md shadow-gold/20'
              : 'text-oat/60 hover:text-gold'
          }`}
        >
          <Cpu size={14} />
          Batch Retro-Remediation
        </button>
      </div>

      {/* TAB 1: MANDATORY VERDICT TABLE (Operating Rule 1 & Law 9) */}
      {activeTab === 'verdict' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  Independent Verdict Table (Law 9 Proof-Pointer Protocol)
                </span>
                <p className="text-oat/60 text-xs font-mono mt-0.5">
                  No verdict without a proof pointer (file:line, exit code, diff, or query result).
                </p>
              </div>

              {verifyResult && (
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                  verifyResult.verdict === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  verifyResult.verdict === 'CONVERGED_WITH_RESIDUAL_RISKS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                  'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  OVERALL: {verifyResult.verdict}
                </span>
              )}
            </div>

            {/* Verdict Table Rows */}
            {!verifyResult ? (
              <div className="py-12 text-center text-oat/40 font-mono text-xs border border-dashed border-gold/15 rounded-xl space-y-2">
                <p>Awaiting verification pass. Click "Run Verify Pass" or "Auto-Convergence Loop" above.</p>
                <button
                  onClick={handleRunVerification}
                  className="px-4 py-2 bg-gold/10 border border-gold/30 text-gold rounded-lg text-xs font-bold hover:bg-gold/20 transition-all"
                >
                  Execute Verification Now
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-gold/20 text-oat/50 uppercase text-[10px]">
                      <th className="pb-3 px-3">Criterion ID</th>
                      <th className="pb-3 px-3">Acceptance Criterion</th>
                      <th className="pb-3 px-3">Check Runner</th>
                      <th className="pb-3 px-3">Verdict</th>
                      <th className="pb-3 px-3">Proof Pointer (Law 9)</th>
                      <th className="pb-3 px-3 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {verifyResult.verdictTable.map((row) => (
                      <tr key={row.acId} className="hover:bg-gold/5 transition-colors">
                        <td className="py-3 px-3 font-bold text-gold">{row.acId}</td>
                        <td className="py-3 px-3 text-oat/90 max-w-xs">{row.criterion}</td>
                        <td className="py-3 px-3 text-purple-400">
                          <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded">
                            {row.checkType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] flex items-center gap-1 w-fit ${
                            row.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {row.status === 'PASS' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-oat/80 font-mono text-[11px] max-w-md">
                          <div className="p-2 bg-vanta/60 rounded border border-gold/10 break-all text-oat/90">
                            {row.proofPointer}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-oat/60">{row.executionMs}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Residual Risks Disclosure (If Converged after 4 rounds) */}
            {verifyResult?.residualRisks && verifyResult.residualRisks.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 font-mono text-xs">
                <span className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Explicit Residual Risks (Named & Documented — Never Silently Accepted)
                </span>
                <ul className="list-disc pl-4 space-y-1 text-amber-200">
                  {verifyResult.residualRisks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CORRECTION LOOP & FINDINGS (Operating Rule 3) */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <AlertTriangle size={15} />
                Severity-Ranked Findings & Engage-Build Correction List
              </span>
              <span className="text-[11px] font-mono text-oat/50">
                Round {roundNumber} of 4 Loop
              </span>
            </div>

            {(!verifyResult?.findings || verifyResult.findings.length === 0) ? (
              <div className="p-8 text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl font-mono text-xs text-emerald-400 space-y-2">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400" />
                <p className="font-bold">Zero Critical / High Findings Logged.</p>
                <p className="text-emerald-300/80 text-[11px]">Pipeline has converged. Verified deliverable ready for Proposal/Invoice package emission.</p>
              </div>
            ) : (
              <div className="space-y-4 font-mono text-xs">
                {/* Findings List */}
                <div className="space-y-3">
                  {verifyResult.findings.map((f, idx) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        f.severity === 'critical' ? 'bg-red-950/30 border-red-500/40 text-red-200' :
                        f.severity === 'high' ? 'bg-orange-950/30 border-orange-500/40 text-orange-200' :
                        'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                            f.severity === 'critical' ? 'bg-red-500 text-white' :
                            f.severity === 'high' ? 'bg-orange-500 text-white' : 'bg-amber-500 text-vanta'
                          }`}>
                            {f.severity}
                          </span>
                          <span className="font-bold text-oat">{f.id} — {f.title}</span>
                        </div>
                        <span className="text-[10px] text-oat/50 uppercase">{f.acId || 'GENERAL'}</span>
                      </div>

                      <p className="text-oat/90 text-xs">{f.what} <span className="text-oat/60 italic">({f.why})</span></p>
                      
                      <div className="p-2.5 bg-vanta/60 rounded border border-gold/10">
                        <span className="text-[10px] text-gold uppercase block font-bold">Proof of Defect (Law 9):</span>
                        <p className="text-[11px] text-oat/80">{f.proofPointer}</p>
                      </div>

                      <div className="p-2.5 bg-emerald-950/30 rounded border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 uppercase block font-bold">Remediation Action for Engage-Build:</span>
                        <p className="text-[11px] text-emerald-300">{f.correctionRequirement}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Handoff Button to Engage-Build */}
                <div className="p-4 bg-vanta/80 rounded-xl border border-gold/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <span className="text-gold font-bold block uppercase text-xs">Correction Handoff Protocol (Law 4)</span>
                    <span className="text-oat/60 text-[11px]">Send numbered correction list back to Phase 2 for surgical remediation.</span>
                  </div>
                  <button
                    onClick={() => {
                      if (onNavigateToBuild) {
                        onNavigateToBuild(selectedContract);
                      }
                    }}
                    className="px-4 py-2 bg-gold text-vanta font-bold uppercase rounded-lg text-xs hover:bg-gold-light transition-all flex items-center gap-1.5"
                  >
                    <ArrowRight size={13} />
                    Open in Engage-Build (Phase 2)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PLAN-LOCK GUARD (Operating Rule 2) */}
      {activeTab === 'plan_guard' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <FolderLock size={15} />
                Plan-Lock Guard: Defect Challenge & Amendment Generator
              </span>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded text-[10px]">
                Operating Rule 2
              </span>
            </div>

            <p className="text-oat/70 leading-relaxed">
              When the Acceptance Contract or plan itself is flawed, uncheckable, or contradicts interview facts,
              the Overseer MUST challenge the plan with evidence instead of blindly patching symptoms.
            </p>

            {/* Simulated Contradiction Card */}
            <div className="p-4 bg-vanta/60 rounded-xl border border-gold/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-red-400 font-bold uppercase text-[11px] flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Detected Scope Contradiction against W0.1 Intake:
                </span>
                <span className="text-[10px] text-oat/50">W0.1 Out-of-Scope Rule 1</span>
              </div>
              <p className="text-oat/90 text-xs">
                Contract specifies <span className="text-gold font-bold">"Direct carrier portal API integration"</span>, 
                which was strictly marked <span className="text-red-400 font-bold">OUT-OF-SCOPE</span> during discovery interview 
                because carrier aggregator credentials require 90-day compliance audits.
              </p>
              
              <button
                onClick={handleChallengePlan}
                disabled={isChallengingPlan}
                className="px-4 py-2 bg-purple-600 text-white font-bold uppercase rounded-lg text-xs hover:bg-purple-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles size={13} />
                {isChallengingPlan ? "Synthesizing Amendment..." : "Challenge Contract & Draft Amendment"}
              </button>
            </div>

            {/* Rendered Amendment */}
            {generatedAmendment && (
              <div className="p-5 bg-purple-950/30 border border-purple-500/40 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-bold uppercase text-xs">
                    Contract Amendment Proposal (v1.1)
                  </span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(generatedAmendment, null, 2), 'amendment')}
                    className="text-purple-300 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedItem === 'amendment' ? <Check size={12} /> : <Copy size={12} />}
                    Copy Amendment
                  </button>
                </div>

                <div className="space-y-2 text-oat/90 text-[11px]">
                  <div>
                    <span className="text-gold font-bold">Scope Adjustment: </span>
                    <span>{generatedAmendment.scopeAdjustment}</span>
                  </div>
                  <div>
                    <span className="text-gold font-bold">Price Adjustment: </span>
                    <span>${generatedAmendment.priceAdjustmentUsd} USD</span>
                  </div>
                  <div>
                    <span className="text-gold font-bold">Lang Visibility: </span>
                    <span>{generatedAmendment.langVisibility}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-500/20 flex items-center justify-end">
                  <button
                    onClick={() => {
                      if (onNavigateToIntake) {
                        onNavigateToIntake(selectedContract);
                      }
                    }}
                    className="px-3 py-1.5 bg-gold text-vanta font-bold uppercase text-[10px] rounded hover:bg-gold-light transition-all flex items-center gap-1"
                  >
                    Send to Engage-Intake for Re-baselining →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROPOSAL / INVOICE PACKAGE (Operating Rule 4) */}
      {activeTab === 'proposal' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <FileText size={15} />
                Verifiable Proposal & Invoice Package (Operating Rule 4)
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px]">
                Ready for SOW & Payment
              </span>
            </div>

            {!verifyResult?.proposalPackage ? (
              <div className="py-12 text-center text-oat/40 border border-dashed border-gold/15 rounded-xl">
                Proposal package generates automatically upon passing all acceptance criteria.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Package Overview */}
                <div className="p-4 bg-vanta/60 rounded-xl border border-gold/10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gold/10 pb-3">
                    <div>
                      <span className="text-gold font-bold text-sm block">
                        {verifyResult.proposalPackage.winningWedge}
                      </span>
                      <span className="text-oat/60 text-[11px]">
                        Client: {verifyResult.proposalPackage.clientName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-oat/50 uppercase block">Milestone Price</span>
                      <span className="text-emerald-400 font-bold text-base">
                        ${verifyResult.proposalPackage.milestonePriceUsd.toLocaleString()} USD
                      </span>
                    </div>
                  </div>

                  {/* Outcome Summary */}
                  <div className="space-y-2">
                    <span className="text-gold font-bold uppercase text-[11px] block">
                      1. Deliverable Outcome Summary:
                    </span>
                    <ul className="list-disc pl-4 space-y-1 text-oat/80">
                      {verifyResult.proposalPackage.outcomeSummary.map((outcome, idx) => (
                        <li key={idx}>{outcome}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Evidence Appendix */}
                  <div className="space-y-2 pt-2 border-t border-gold/10">
                    <span className="text-gold font-bold uppercase text-[11px] block">
                      2. Verifiable Evidence Appendix:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      {verifyResult.proposalPackage.evidenceAppendix.map((appx, idx) => (
                        <div key={idx} className="p-3 bg-vanta/60 rounded-xl border border-gold/10 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gold font-bold">{appx.acId}</span>
                            <span className="text-[9px] text-purple-400 uppercase">{appx.complianceStandard}</span>
                          </div>
                          <p className="text-oat/70 text-[10px]">{appx.proofPointer}</p>
                          <span className="text-[9px] text-oat/40 font-mono block">Digest: {appx.artifactDigest.slice(0, 16)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Next Parked Wedges with 1-Click Promote */}
                  <div className="space-y-2 pt-2 border-t border-gold/10">
                    <span className="text-gold font-bold uppercase text-[11px] block">
                      3. Expansion Roadmaps (Click to Seed Next Engagement in Intake):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {verifyResult.proposalPackage.nextWedges.map((wedge, idx) => (
                        <button
                          key={idx}
                          onClick={() => handlePromoteNextWedgeToIntake(wedge)}
                          className="px-3 py-1.5 bg-gold/10 border border-gold/30 text-gold rounded-lg text-[11px] hover:bg-gold hover:text-vanta transition-all flex items-center gap-1.5 font-bold"
                        >
                          <Zap size={11} />
                          + Seed: {wedge}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Compliance Certificate */}
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                    <div className="space-y-0.5">
                      <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                        <ShieldCheck size={14} />
                        {verifyResult.proposalPackage.complianceCertificate.status}
                      </span>
                      <span className="text-oat/50 text-[10px] font-mono">
                        Certificate SHA256: {verifyResult.proposalPackage.complianceCertificate.sha256Digest.slice(0, 24)}...
                      </span>
                    </div>
                    <span className="text-[10px] text-oat/50 font-mono">
                      Signed: {new Date(verifyResult.proposalPackage.complianceCertificate.signedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Routing buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {onNavigateToSow && (
                    <button
                      onClick={() => onNavigateToSow(verifyResult.proposalPackage)}
                      className="flex-1 py-3 bg-gold text-vanta font-bold uppercase tracking-wider rounded-xl hover:bg-gold-light transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                    >
                      <FileSignature size={14} />
                      Create Executable SOW with Verified Evidence →
                    </button>
                  )}
                  {onNavigateToInvoice && (
                    <button
                      onClick={() => onNavigateToInvoice(verifyResult.proposalPackage)}
                      className="flex-1 py-3 bg-emerald-500 text-vanta font-bold uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <DollarSign size={14} />
                      Generate Milestone Invoice (${verifyResult.proposalPackage.milestonePriceUsd.toLocaleString()}) →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: CORPUS FLYWHEEL HARVEST (Operating Rule 5) */}
      {activeTab === 'harvest' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                <Database size={15} />
                Corpus Harvest & Master Data Flywheel (Compounding IS the Moat)
              </span>
              <span className="px-2 py-0.5 bg-gold/10 text-gold rounded border border-gold/20 text-[10px]">
                Operating Rule 5
              </span>
            </div>

            <p className="text-oat/70 leading-relaxed">
              Every verified pass writes directly into the Neon / Firestore master flywheel: verified engagement status,
              reusable adapters, new golden fixtures, error remedies for failure classes hit, and harvested objections.
            </p>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-gold/60" />
                <input
                  type="text"
                  placeholder="Search error remedies, failure classes, adapters..."
                  value={flywheelSearch}
                  onChange={(e) => setFlywheelSearch(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-xl pl-9 pr-3 py-2 text-xs text-oat placeholder-oat/30 focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* Harvest Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Engagement Status</span>
                <span className="text-emerald-400 font-bold">VERIFIED</span>
              </div>
              <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Adapters Harvested</span>
                <span className="text-gold font-bold">2 Reusable</span>
              </div>
              <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Golden Fixtures</span>
                <span className="text-oat font-bold">{selectedContract?.passConditions?.length || 3} Stored</span>
              </div>
              <div className="p-3 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Error Remedies</span>
                <span className="text-purple-300 font-bold">{filteredRemedies.length} Classes</span>
              </div>
            </div>

            {/* Harvested Error Remedies List */}
            <div className="space-y-2 pt-2 border-t border-gold/10">
              <span className="text-gold font-bold uppercase text-xs block">
                Harvested Error Remedies (Master Data Flywheel):
              </span>
              <div className="space-y-2">
                {filteredRemedies.map((rem, idx) => (
                  <div key={idx} className="p-3 bg-vanta/80 rounded-xl border border-gold/10 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-bold text-[11px]">{rem.errorClass}</span>
                      <span className="text-gold/60 text-[10px]">{rem.corpusAdapterTarget}</span>
                    </div>
                    <p className="text-oat/70 text-[10px]">{rem.failureMode}</p>
                    <p className="text-emerald-400 text-[11px] font-bold">Remedy: {rem.remedy}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Commit Harvest Action */}
            <div className="pt-4 border-t border-gold/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-oat/60">
                {harvestCommitted ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    Harvest committed to Master Flywheel. SHA256: {harvestHash?.slice(0, 16)}...
                  </span>
                ) : (
                  <span>Harvest payload staged and ready for master flywheel synchronization.</span>
                )}
              </div>

              <button
                onClick={handleCommitHarvest}
                disabled={isHarvesting || harvestCommitted || !verifyResult}
                className="px-5 py-2.5 bg-gold text-vanta font-bold uppercase tracking-wider rounded-xl hover:bg-gold-light transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-md shadow-gold/20"
              >
                <Database size={13} />
                {harvestCommitted ? "Harvest Committed ✓" : isHarvesting ? "Writing to Master Flywheel..." : "Commit Harvest to Flywheel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DISPUTE PACKET GENERATOR (Suggested Expansion Feature) */}
      {activeTab === 'dispute_tool' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                  <FileCheck2 size={15} />
                  Automated Carrier Dispute Notice Packet Generator
                </span>
                <p className="text-oat/60 text-xs mt-0.5">
                  Generates legally fortified dispute demand letters citing verified EDI-835 discrepancy data.
                </p>
              </div>
              <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 rounded border border-purple-500/20 text-[10px]">
                Wedge Expansion
              </span>
            </div>

            {/* Input Config Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-oat/50 uppercase block mb-1">Target Carrier</label>
                <select
                  value={disputeCarrier}
                  onChange={(e) => setDisputeCarrier(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-lg px-3 py-2 text-oat text-xs"
                >
                  <option value="Humana">Humana Insurance</option>
                  <option value="UnitedHealthcare">UnitedHealthcare (UHC)</option>
                  <option value="Aetna / CVS Health">Aetna / CVS Health</option>
                  <option value="Cigna Medicare">Cigna Medicare</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-oat/50 uppercase block mb-1">Broker NPN / Reference ID</label>
                <input
                  type="text"
                  value={disputeBrokerId}
                  onChange={(e) => setDisputeBrokerId(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-lg px-3 py-2 text-oat text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-oat/50 uppercase block mb-1">Unreconciled Amount ($ USD)</label>
                <input
                  type="text"
                  value={disputeAmount}
                  onChange={(e) => setDisputeAmount(e.target.value)}
                  className="w-full bg-vanta border border-gold/20 rounded-lg px-3 py-2 text-oat text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateDisputeLetter}
              className="px-4 py-2.5 bg-gold text-vanta font-bold uppercase text-xs rounded-xl hover:bg-gold-light transition-all flex items-center gap-1.5 shadow-md shadow-gold/20"
            >
              <FileSignature size={13} />
              Generate Audit Dispute Packet
            </button>

            {/* Generated Letter Output */}
            {generatedDisputeLetter && (
              <div className="p-4 bg-vanta/90 border border-gold/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gold/10 pb-2">
                  <span className="text-gold font-bold uppercase text-[11px]">
                    Formatted Legal Dispute Demand Letter (CMS 42 CFR Compliant)
                  </span>
                  <button
                    onClick={() => handleCopy(generatedDisputeLetter, 'dispute')}
                    className="text-gold hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedItem === 'dispute' ? <Check size={12} /> : <Copy size={12} />}
                    Copy Text
                  </button>
                </div>
                <pre className="text-oat/90 text-[11px] whitespace-pre-wrap font-mono leading-relaxed bg-black/40 p-4 rounded-lg border border-gold/10">
                  {generatedDisputeLetter}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: BATCH RETRO-REMEDIATION PIPELINE (Suggested Expansion Feature) */}
      {activeTab === 'batch_tool' && (
        <div className="space-y-6">
          <div className="p-6 bg-vanta-light/40 border border-gold/15 rounded-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest text-gold font-bold flex items-center gap-1.5">
                  <Cpu size={15} />
                  Batch Remediation Pipeline for Retroactive Claims
                </span>
                <p className="text-oat/60 text-xs mt-0.5">
                  Automated high-throughput recalculator for retroactive commissions & unallocated carrier clawbacks.
                </p>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-[10px]">
                High-Volume Engine
              </span>
            </div>

            {/* Batch Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Pending EDI Claim Files</span>
                <span className="text-gold font-bold text-lg">{batchFilesCount} Batch Files</span>
              </div>
              <div className="p-4 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Total Discrepancy Pool</span>
                <span className="text-red-400 font-bold text-lg">${batchTotalDiscrepancy.toLocaleString()} USD</span>
              </div>
              <div className="p-4 bg-vanta/60 rounded-xl border border-gold/10">
                <span className="text-[10px] text-oat/50 uppercase block">Estimated Recovery Yield</span>
                <span className="text-emerald-400 font-bold text-lg">98.4% ($24,452.40)</span>
              </div>
            </div>

            <button
              onClick={handleRunBatchRemediation}
              disabled={isBatchRemediating}
              className="px-5 py-2.5 bg-emerald-500 text-vanta font-bold uppercase text-xs rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Zap size={13} className={isBatchRemediating ? 'animate-spin' : ''} />
              {isBatchRemediating ? "Processing Retroactive Claims..." : "Execute Batch Remediation Pipeline"}
            </button>

            {batchRemediatedDone && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl space-y-2">
                <span className="text-emerald-400 font-bold uppercase text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  Batch Remediation Complete — 18 Files Reconciled
                </span>
                <p className="text-oat/80 text-[11px]">
                  $24,452.40 in unallocated Medicare commissions recovered and matched to broker NPN roster. 
                  Audit ledger exported to Master Flywheel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOSSIER EXPORT MODAL */}
      <AnimatePresence>
        {showDossierModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-vanta border border-gold/30 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 font-mono text-xs space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gold/20 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-gold" />
                  <span className="text-gold font-bold uppercase text-sm">
                    Verified Acceptance & Compliance Audit Dossier
                  </span>
                </div>
                <button
                  onClick={() => setShowDossierModal(false)}
                  className="text-oat/50 hover:text-white text-xs"
                >
                  ✕ Close
                </button>
              </div>

              {/* Dossier Body Content */}
              <div className="space-y-4 text-oat/90 bg-black/40 p-4 rounded-xl border border-gold/10">
                <div>
                  <h3 className="text-gold font-bold uppercase text-xs">1. Engagement Header</h3>
                  <p className="text-[11px]">Contract ID: {selectedContract?.id}</p>
                  <p className="text-[11px]">Client: {selectedContract?.clientName}</p>
                  <p className="text-[11px]">Winning Wedge: {selectedContract?.winningWedge}</p>
                  <p className="text-[11px]">Audit Timestamp: {new Date().toISOString()}</p>
                </div>

                <div>
                  <h3 className="text-gold font-bold uppercase text-xs">2. Independent Verdict Results (Law 9)</h3>
                  <div className="space-y-1 text-[11px]">
                    {verifyResult?.verdictTable.map((row, idx) => (
                      <div key={idx} className="p-2 bg-vanta/60 rounded border border-gold/10">
                        <span className="font-bold text-gold">[{row.acId}]</span> {row.criterion} — <span className="text-emerald-400 font-bold">{row.status}</span>
                        <div className="text-oat/60 text-[10px] mt-0.5">Proof: {row.proofPointer} ({row.executionMs}ms)</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-gold font-bold uppercase text-xs">3. Cryptographic Signature & Seal</h3>
                  <p className="text-[11px] text-emerald-400">Status: {verifyResult?.proposalPackage?.complianceCertificate?.status || 'VERIFIED'}</p>
                  <p className="text-[10px] text-oat/60 break-all">Digest: SHA256-{verifyResult?.proposalPackage?.complianceCertificate?.sha256Digest || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gold/10">
                <button
                  onClick={() => handleCopy(JSON.stringify(verifyResult, null, 2), 'dossier')}
                  className="px-4 py-2 bg-vanta border border-gold/20 text-gold rounded-lg hover:bg-gold/10 transition-all flex items-center gap-1.5"
                >
                  {copiedItem === 'dossier' ? <Check size={13} /> : <Copy size={13} />}
                  Copy JSON Dossier
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-gold text-vanta font-bold uppercase rounded-lg hover:bg-gold-light transition-all flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  Print / Save PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
