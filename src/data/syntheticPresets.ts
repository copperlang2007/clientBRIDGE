export interface SyntheticPreset {
  id: string;
  name: string;
  industry: string;
  complianceTier: 'regulated-medicare' | 'regulated-other' | 'unregulated';
  governingFramework: string;
  description: string;
  initialTranscript: Array<{ role: 'user' | 'model'; text: string; timestamp?: string }>;
  candidateWedges: Array<{
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
  }>;
  winningWedge: string;
  passConditions: string[];
  outOfScope: string[];
  objections: Array<{
    objection: string;
    category: string;
    countermeasure: string;
  }>;
}

export const SYNTHETIC_PRESETS: SyntheticPreset[] = [
  {
    id: 'medicare-fmo-pack-1',
    name: 'Apex Health Brokers (Medicare FMO Pack #1)',
    industry: 'Medicare Insurance Field Marketing Organization (FMO)',
    complianceTier: 'regulated-medicare',
    governingFramework: 'CMS TPMO Rule (42 CFR § 422.2274) & HIPAA Security Rule (45 CFR Part 164)',
    description: 'Mid-sized FMO supporting 450 contracted downline agents distributing Medicare Advantage and Part D plans across 8 carrier portals.',
    initialTranscript: [
      {
        role: 'model',
        text: 'Welcome to artificialBRIDGE engage-intake. Let’s identify the single highest-impact workflow wedge for your Medicare brokerage. What does your core business handle, and what operational workflow is draining the most hours or causing costly errors today?'
      },
      {
        role: 'user',
        text: 'We are Apex Health Brokers, a Medicare FMO with 450 downline agents. Our biggest headache is Carrier Commission Reconciliation and Agent Ready-to-Sell (RTS) compliance tracking. We also struggle with carrier statement normalization and onboarding packet chasing.'
      },
      {
        role: 'model',
        text: 'Understood. Let’s look at Commission Reconciliation first. Who does this workflow today, how many hours per week do they spend, and what is the financial cost or operational blast radius when errors slip through?'
      },
      {
        role: 'user',
        text: 'Our 3-person finance team spends 22 hours every week cross-referencing 8 carrier direct-deposit CSVs against our agency CRM enrollments. We frequently discover 3-5% underpayment leakage ($18,000 to $35,000 per month in missed overrides) and chargeback reconciliation takes 3 weeks to dispute.'
      },
      {
        role: 'model',
        text: 'Where does the source data live, and what formats are available? Also, let’s confirm data access legality: do you have direct carrier portal exports and authorized CRM API keys without scraping behind ToS barriers?'
      },
      {
        role: 'user',
        text: 'Yes, we download raw 835 EDI files and CSV commission statements directly from authenticated carrier partner portals (Humana, UHC, Aetna, etc.) and our CRM has a standard REST API. No scraping or unauthorized access needed.'
      },
      {
        role: 'model',
        text: 'What does "working" look like in your own words? What deterministic criteria must be met for this to be considered 100% successful?'
      },
      {
        role: 'user',
        text: 'It must ingest 8 carrier commission statement formats, match 100% of policy numbers against active CRM accounts within 30 seconds, flag all discrepancy amounts > $0.01 with line-item carrier citations, and generate an automated dispute ledger ready for carrier submission.'
      },
      {
        role: 'model',
        text: 'Because you operate in Medicare, CMS TPMO rules (42 CFR § 422.2274) and HIPAA apply. We will enforce tpmo-compliance-gate, hipaa-risk-assessor, and cfr-citation-verifier, with strict PHI perimeter isolation and a BAA before live data connection. Who holds budget approval for this engagement?'
      },
      {
        role: 'user',
        text: 'I am the Managing Principal and Chief Operating Officer, and I hold direct signing and budget authority up to $50,000 for this first wedge.'
      }
    ],
    candidateWedges: [
      {
        id: 'wedge-comm-recon',
        name: 'Carrier Commission Reconciliation Audit Engine',
        description: 'Automated ingestion, normalization, policy-level variance matching, and dispute generation across 8 carrier commission feeds.',
        scores: {
          errorCostSeverity: 5,
          dataAccessibility: 5,
          volumeRepeatability: 5,
          verificationClarity: 5,
          timeToValue: 4
        },
        totalScore: 24,
        interviewCitations: {
          errorCost: 'Managing Principal cited "$18,000 - $35,000/mo underpayment leakage and 22 hrs/wk lost in 3-person team".',
          data: 'Direct authenticated 835 EDI and carrier CSV downloads with official CRM REST API.',
          volume: 'Weekly recurring reconciliation across 450 active downline writing agents.',
          verification: 'Deterministic math: 100% line-item balance comparison, flagged variance > $0.01, policy ID matching.',
          timeToValue: 'Stand-alone parsing and reconciliation logic deployable within 3 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Standard authorized carrier partner exports and internal CRM records. No scraping or ToS violation.',
          tosRisk: 'Low / Compliant'
        },
        status: 'selected'
      },
      {
        id: 'wedge-rts-chase',
        name: 'Agent Ready-to-Sell (RTS) Compliance Verification',
        description: 'Automated AHIP certification, state license, and E&O verification chase before AEP kickoff.',
        scores: {
          errorCostSeverity: 4,
          dataAccessibility: 4,
          volumeRepeatability: 3,
          verificationClarity: 5,
          timeToValue: 4
        },
        totalScore: 20,
        interviewCitations: {
          errorCost: 'Non-compliant agent sales risk CMS TPMO fines and carrier contract termination.',
          data: 'NIPR lookup API and AHIP certification verification portal exports.',
          volume: 'Heavy seasonal peak in Q3 (pre-AEP) rather than continuous weekly volume.',
          verification: 'Binary pass/fail: valid AHIP year, active state license, active E&O policy.',
          timeToValue: '3-4 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'NIPR authorized gateway and agent-supplied proof documents.',
          tosRisk: 'Low / Compliant'
        },
        status: 'parked_next_wedge'
      },
      {
        id: 'wedge-statement-norm',
        name: 'Multi-Carrier Statement Schema Normalizer',
        description: 'Universal schema mapper for carrier commission and override schedules.',
        scores: {
          errorCostSeverity: 3,
          dataAccessibility: 4,
          volumeRepeatability: 4,
          verificationClarity: 4,
          timeToValue: 4
        },
        totalScore: 19,
        interviewCitations: {
          errorCost: 'Downstream reporting delays and data munging friction.',
          data: 'Carrier CSV and PDF statements.',
          volume: 'Bi-weekly and monthly billing cycles.',
          verification: 'Schema validation against unified field taxonomy.',
          timeToValue: '2-3 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Direct carrier file feeds.',
          tosRisk: 'Low / Compliant'
        },
        status: 'parked_next_wedge'
      },
      {
        id: 'wedge-onboarding-packet',
        name: 'Downline Onboarding Packet Automator',
        description: 'Automated contract generation and W-9 / direct deposit verification for new agents.',
        scores: {
          errorCostSeverity: 3,
          dataAccessibility: 4,
          volumeRepeatability: 3,
          verificationClarity: 4,
          timeToValue: 4
        },
        totalScore: 18,
        interviewCitations: {
          errorCost: 'Lag in agent contracting turnaround time (5-7 days).',
          data: 'DocuSign and Form submissions.',
          volume: '15-20 agent onboarding packets per month.',
          verification: 'Document completion and signature verification.',
          timeToValue: '3 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Authorized agent-provided forms.',
          tosRisk: 'Low / Compliant'
        },
        status: 'parked_next_wedge'
      },
      {
        id: 'wedge-chargeback-dispute',
        name: 'Carrier Chargeback & Lapsed Policy Dispute Generator',
        description: 'Automated reconciliation of chargebacks against grace-period reinstatement records.',
        scores: {
          errorCostSeverity: 4,
          dataAccessibility: 3,
          volumeRepeatability: 3,
          verificationClarity: 4,
          timeToValue: 3
        },
        totalScore: 17,
        interviewCitations: {
          errorCost: '$5,000 - $12,000 monthly in unverified chargeback deductions.',
          data: 'Carrier dispute portal filings.',
          volume: 'Monthly batch dispute filings.',
          verification: 'Reinstatement date vs chargeback date timestamp check.',
          timeToValue: '4 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Authorized dispute workflows.',
          tosRisk: 'Low / Compliant'
        },
        status: 'parked_next_wedge'
      }
    ],
    winningWedge: 'Carrier Commission Reconciliation Audit Engine',
    passConditions: [
      'Ingests 8 specified carrier statement formats (CSV, XLSX, 835 EDI) with 100% syntax validation and zero silent dropping.',
      'Executes deterministic policy-number and writing-agent matching against CRM accounts with < 0.01 variance detection threshold.',
      'Generates a categorized carrier dispute ledger with direct statement row-index citations within 30 seconds for files up to 50,000 line items.',
      'Operates exclusively within HIPAA-compliant perimeter with BAA execution and automated audit logging of all operator actions.'
    ],
    outOfScope: [
      'Downline agent commission payouts and bank ACH disbursement (handled by existing banking rail)',
      'Agent licensing verification and AHIP compliance (parked as Next Wedge #2)',
      'Client marketing campaigns and lead generation pipelines',
      'Direct carrier portal bot automation / scraping behind login captchas'
    ],
    objections: [
      {
        objection: 'Our carrier formats change without warning every few months.',
        category: 'Technical Robustness',
        countermeasure: 'Built with resilient semantic schema mapping and explicit schema drift alerts that isolate unmapped columns rather than failing the run.'
      },
      {
        objection: 'We cannot risk client Medicare ID / PHI leakage into public LLMs.',
        category: 'Compliance & Security',
        countermeasure: 'Strict compliance gate: local deterministic calculation engine with zero PHI transmission to external generative endpoints, governed by BAA.'
      }
    ]
  },
  {
    id: 'fintech-escrow-pack',
    name: 'Nova Escrow Services (FinTech Pack)',
    industry: 'Real Estate Escrow & Title Settlement',
    complianceTier: 'regulated-other',
    governingFramework: 'ALTA Best Practices Pillar 2, FTC Safeguards Rule & SOC 2 Type II',
    description: 'Commercial and residential title & escrow agency closing $80M in monthly real estate transactions across 3 regional branches.',
    initialTranscript: [
      {
        role: 'model',
        text: 'Welcome to artificialBRIDGE engage-intake. Let’s isolate your single highest-value workflow wedge. What is the core business and what repetitive workflow carries the highest financial liability today?'
      },
      {
        role: 'user',
        text: 'We are Nova Escrow Services. Our escrow officers spend 15 hours a week verifying outgoing wire settlement instructions and balancing closing disclosure HUD-1 ledgers against lender disbursement schedules.'
      }
    ],
    candidateWedges: [
      {
        id: 'wedge-wire-audit',
        name: 'Inbound Wire Instruction Fraud & Payoff Verification Engine',
        description: 'Multi-point verification of incoming payoff demand letters and title wire instructions against verified lender databases.',
        scores: {
          errorCostSeverity: 5,
          dataAccessibility: 4,
          volumeRepeatability: 5,
          verificationClarity: 5,
          timeToValue: 5
        },
        totalScore: 24,
        interviewCitations: {
          errorCost: 'Single wire fraud incident can cause $250,000+ total catastrophic loss and loss of license.',
          data: 'PDF payoff demand statements and verified escrow trust ledger exports.',
          volume: '120-180 closing wires processed monthly.',
          verification: 'Deterministic bank routing check, phone verification hash, and lender registry match.',
          timeToValue: '2 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Standard authorized escrow closing documents. No scraping.',
          tosRisk: 'Low / Compliant'
        },
        status: 'selected'
      }
    ],
    winningWedge: 'Inbound Wire Instruction Fraud & Payoff Verification Engine',
    passConditions: [
      'Extracts and cross-verifies routing numbers, beneficiary names, and escrow file IDs from PDF payoff letters with 100% field validation.',
      'Checks wire routing against Federal Reserve E-Payments routing registry with zero false matches.',
      'Enforces mandatory dual-custody verification checklist before generating exportable wire disbursement manifest.'
    ],
    outOfScope: [
      'Direct Fedwire bank transmission execution (handled by authorized bank token hardware)',
      'Title insurance underwriting policy issuance'
    ],
    objections: [
      {
        objection: 'Our closing software is an on-premise legacy database.',
        category: 'Integration',
        countermeasure: 'Ingestion via standard local PDF drop folder and verified CSV export connector.'
      }
    ]
  },
  {
    id: 'logistics-freight-pack',
    name: 'CloudForge Freight (B2B Logistics Pack)',
    industry: '3PL Freight Brokerage & Fleet Management',
    complianceTier: 'unregulated',
    governingFramework: 'Standard Commercial & Uniform Commercial Code (UCC)',
    description: 'B2B freight brokerage managing 1,200 dry van and refrigerated shipments per month across 600 motor carriers.',
    initialTranscript: [
      {
        role: 'model',
        text: 'Welcome to artificialBRIDGE engage-intake. What single workflow causes the highest operational friction and error cost in your freight operations?'
      },
      {
        role: 'user',
        text: 'We are CloudForge Freight. We spend 30 hours a week chasing carrier Bills of Lading (BOLs), proof of delivery (PODs), and reconciling detention fee claims from drivers.'
      }
    ],
    candidateWedges: [
      {
        id: 'wedge-bol-recon',
        name: 'Automated BOL/POD Ingestion & Accessorial Dispute Engine',
        description: 'Instant OCR document extraction, signature detection, and detention timestamp reconciliation against telematics geofence logs.',
        scores: {
          errorCostSeverity: 4,
          dataAccessibility: 5,
          volumeRepeatability: 5,
          verificationClarity: 5,
          timeToValue: 5
        },
        totalScore: 24,
        interviewCitations: {
          errorCost: 'Delayed shipper invoicing averages 14 days, with $12,000/mo in unrecovered driver detention charges.',
          data: 'Mobile camera POD uploads, TMS API, and Samsara/Geotab GPS logs.',
          volume: '300+ shipments weekly.',
          verification: 'Signature presence check + GPS geofence arrival/departure timestamp delta calculation.',
          timeToValue: '2 weeks.'
        },
        legalityScreen: {
          passed: true,
          notes: 'Driver-uploaded PODs and authorized TMS telematics data.',
          tosRisk: 'Low / Compliant'
        },
        status: 'selected'
      }
    ],
    winningWedge: 'Automated BOL/POD Ingestion & Accessorial Dispute Engine',
    passConditions: [
      'Parses photo/PDF proof-of-delivery receipts, verifying signature presence and matching PRO/Load number against TMS with > 99% accuracy.',
      'Reconciles driver detention claims against telematics GPS entry/exit timestamps within 5-second processing window.',
      'Generates completed invoice billing packet ready for factor/shipper distribution.'
    ],
    outOfScope: [
      'Driver GPS tracking hardware installation',
      'Freight load board automated bidding'
    ],
    objections: [
      {
        objection: 'Driver photo uploads are often wrinkled or low lighting.',
        category: 'Computer Vision',
        countermeasure: 'Integrated image normalization and contrast enhancement pipeline with fallback human-in-the-loop review queue.'
      }
    ]
  }
];
