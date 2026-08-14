export interface AcceptanceCriterion {
  id: string; // e.g. "AC-1", "AC-2"
  criterion: string;
  checkType: 'fixture-comparison' | 'deterministic-execution' | 'metric-threshold' | 'schema-validation' | 'compliance-audit';
  checkCommand?: string;
  expectedResult?: string;
}

export interface VerdictRow {
  acId: string;
  criterion: string;
  checkType: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  proofPointer: string; // Law 9: mandatory proof pointer (file:line, exit_code, diff: 0 lines, query result)
  executionMs: number;
  uncheckable?: boolean;
}

export interface Finding {
  id: string;
  acId?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  what: string;
  why: string;
  proofPointer: string;
  correctionRequirement: string;
  targetPhase: 'engage-build' | 'engage-intake';
  category: 'artifact_defect' | 'uncheckable_criterion' | 'plan_lock_defect' | 'compliance_breach';
}

export interface PlanDefectChallenge {
  id: string;
  acId: string;
  originalCriterion: string;
  defectReason: string;
  contradiction: string;
  recommendedAmendment: string;
  langVisibilityRequired: boolean;
  priceOrScopeImpact: string;
}

export interface ProposalInvoicePackage {
  contractId: string;
  clientName: string;
  winningWedge: string;
  complianceTier: string;
  milestonePriceUsd: number;
  outcomeSummary: string[]; // Only claims with evidence behind them
  evidenceAppendix: {
    acId: string;
    proofPointer: string;
    artifactDigest: string;
    complianceStandard: string;
  }[];
  nextWedges: string[];
  complianceCertificate: {
    tier: string;
    status: 'COMPLIANT_PERIMETER_VERIFIED' | 'COMMERCIAL_STANDARD';
    signedAt: string;
    sha256Digest: string;
  };
}

export interface HarvestRecord {
  engagementId: string;
  verifiedAt: string;
  adaptersHarvested: number;
  fixturesHarvested: number;
  errorRemediesHarvested: number;
  objectionPatternsHarvested: number;
  masterFlywheelHash: string;
}

export interface VerificationRunResult {
  id: string;
  contractId: string;
  roundNumber: number;
  verdict: 'PASS' | 'FAIL' | 'CONVERGED_WITH_RESIDUAL_RISKS' | 'PLAN_DEFECT';
  verdictTable: VerdictRow[];
  findings: Finding[];
  correctionList: string[];
  planDefects: PlanDefectChallenge[];
  residualRisks: string[];
  proposalPackage?: ProposalInvoicePackage;
  harvestRecords?: HarvestRecord;
  certificateDigest: string;
  verifiedAt: string;
  isFreshContext: boolean;
}

export const VERIFY_CHECK_RUNNERS = [
  {
    type: 'deterministic-execution',
    label: 'Deterministic Execution Check',
    description: 'Executes parser or calculation pipeline with exit code 0 and verifies zero unhandled exception records.',
    examplePointer: 'exit_code: 0, 100% matched across 14 carrier loops, 0 unhandled exception records'
  },
  {
    type: 'fixture-comparison',
    label: 'Golden Fixture Comparison',
    description: 'Performs byte-level diff against expected golden test fixtures with exact line and checksum validation.',
    examplePointer: 'diff: 0 lines vs fixtures/stmt-humana-01.expected (SHA256: 8f3c...)'
  },
  {
    type: 'metric-threshold',
    label: 'Quantitative Metric Threshold',
    description: 'Evaluates numerical boundary criteria (error rate < 0.01%, sub-second p99 latency, $0 stack cost).',
    examplePointer: 'error_rate: 0.00% <= 0.01% threshold (0 errors / 12,450 records, p99: 18ms)'
  },
  {
    type: 'compliance-audit',
    label: 'Regulatory Compliance Audit',
    description: 'Verifies adherence to statutory mandates (CMS 42 CFR § 422.2274, HIPAA PHI-perimeter sanitization, dual-key auth).',
    examplePointer: 'CMS 42 CFR § 422.2274 10-year archival timestamp verified (Digest: 4a2b9c...)'
  },
  {
    type: 'schema-validation',
    label: 'Strict Schema & Stack Validation',
    description: 'Checks output structure, schema invariants, and verifies zero unauthorized paid external dependencies.',
    examplePointer: 'schema_invariants: 100% valid JSON-Schema, $0 stack cost constraint verified'
  }
];

export const SAMPLE_HARVESTED_ERROR_REMEDIES = [
  {
    errorClass: 'W0.3_UNCHECKABLE_CRITERION',
    failureMode: 'Acceptance criterion specifies subjective quality without numeric threshold (e.g. "intuitive UI flow")',
    remedy: 'Attach finding to CONTRACT -> route to engage-intake for automated criterion reformulation into machine-checkable telemetry bounds.',
    corpusAdapterTarget: 'Intake_Rubric_v1_Generator'
  },
  {
    errorClass: 'W0.3_FIXTURE_DIFF_MISMATCH',
    failureMode: 'Carrier statement header segment contains non-standard carrier-specific adjustment code',
    remedy: 'Emit fallback normalized loop in EDI-835 adapter with strict carrier alias dictionary lookup.',
    corpusAdapterTarget: 'Carrier_EDI_835_Reconciler'
  },
  {
    errorClass: 'W0.3_PHI_PERIMETER_LEAK',
    failureMode: 'Raw Medicare Beneficiary Identifier (MBI) present in client-facing log stream',
    remedy: 'Apply deterministic one-way HMAC-SHA256 anonymization pipeline prior to staging verify artifacts.',
    corpusAdapterTarget: 'CMS_TPMO_Marketing_Validator'
  }
];
