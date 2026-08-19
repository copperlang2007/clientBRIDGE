/**
 * clientBRIDGE — Firestore rules regression suite (SEC-001)
 *
 * Run:  bunx firebase emulators:exec --only firestore "bunx vitest run tests/firestore.rules.test.ts"
 *
 * Every test maps to a requirement in
 * build-contract-os/projects/clientbridge/REQUIREMENTS.yaml.
 * A failure means a critical finding has reopened. Do not skip.
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';

let testEnv: RulesTestEnvironment;

const OWNER = { email: 'Lang@theartificialbridge.com', email_verified: true };
const CLIENT = { email: 'client@example.com', email_verified: true };

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'clientbridge-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => { await testEnv.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/owner_uid'), { uid: 'owner_uid', email: OWNER.email, role: 'admin' });
    await setDoc(doc(db, 'users/client_uid'), { uid: 'client_uid', email: CLIENT.email, role: 'client' });
    await setDoc(doc(db, 'engagements/eng_1'), { clientUid: 'client_uid', status: 'contracted', createdAt: '2026-08-19' });
  });
});

const owner = () => testEnv.authenticatedContext('owner_uid', OWNER).firestore();
const client = () => testEnv.authenticatedContext('client_uid', CLIENT).firestore();
const stranger = () => testEnv.authenticatedContext('attacker_uid', { email: 'attacker@example.com', email_verified: true }).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

describe('REQ-001 role self-assignment', () => {
  it('denies a new signup creating their own admin user document', async () => {
    await assertFails(setDoc(doc(stranger(), 'users/attacker_uid'), { uid: 'attacker_uid', email: 'attacker@example.com', role: 'admin' }));
  });

  it('denies self-assigning any non-client role', async () => {
    await assertFails(setDoc(doc(stranger(), 'users/attacker_uid'), { uid: 'attacker_uid', email: 'attacker@example.com', role: 'manager' }));
  });

  it('allows a new signup to create their own client user document', async () => {
    await assertSucceeds(setDoc(doc(stranger(), 'users/attacker_uid'), { uid: 'attacker_uid', email: 'attacker@example.com', role: 'client' }));
  });

  it('denies a client escalating their own role by update', async () => {
    await assertFails(updateDoc(doc(client(), 'users/client_uid'), { role: 'admin' }));
  });
});

describe('REQ-002 admin allow-list', () => {
  it('denies admin to the former demo address', async () => {
    const demo = testEnv.authenticatedContext('demo_uid', { email: 'admin@demo.com', email_verified: true }).firestore();
    await assertFails(getDoc(doc(demo, 'users/client_uid')));
  });

  it('denies admin to the former secondary agency address', async () => {
    const legacy = testEnv.authenticatedContext('legacy_uid', { email: 'mlang@team-iia.com', email_verified: true }).firestore();
    await assertFails(getDoc(doc(legacy, 'users/client_uid')));
  });
});

describe('REQ-005 email verification', () => {
  it('denies admin when the owner email claim is unverified', async () => {
    const unverified = testEnv.authenticatedContext('spoof_uid', { email: OWNER.email, email_verified: false }).firestore();
    await assertFails(getDoc(doc(unverified, 'users/client_uid')));
  });
});

describe('REQ-003 execution corpus', () => {
  const verdict = { contractId: 'eng_1', verdict: 'PASS', verdictTable: [], verifiedAt: '2026-08-19' };

  it('denies a client writing their own PASS verdict', async () => {
    await assertFails(setDoc(doc(client(), 'verifications/forged'), verdict));
  });

  it('denies an unrelated account writing a verdict', async () => {
    await assertFails(setDoc(doc(stranger(), 'verifications/forged'), verdict));
  });

  it('allows an operator to write a verdict', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'verifications/v1'), verdict));
  });

  it('denies editing or deleting a verdict once written, even as admin', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'verifications/v1'), verdict);
    });
    await assertFails(updateDoc(doc(owner(), 'verifications/v1'), { verdict: 'FAIL' }));
    await assertFails(deleteDoc(doc(owner(), 'verifications/v1')));
  });

  it('denies a client writing build_runs, corpus_adapters or error_remedies', async () => {
    await assertFails(setDoc(doc(client(), 'build_runs/b1'), { contractId: 'eng_1', status: 'passed', createdAt: '2026-08-19' }));
    await assertFails(setDoc(doc(client(), 'corpus_adapters/a1'), { name: 'x', reuseCount: 99, isZeroCost: true }));
    await assertFails(setDoc(doc(client(), 'error_remedies/e1'), { errorClass: 'x', failureMode: 'y', remedy: 'z' }));
  });
});

describe('REQ-004 audit_logs', () => {
  const entry = { action: 'login', timestamp: '2026-08-19', actorUid: 'client_uid' };

  it('denies a client reading the global audit log', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'audit_logs/a1'), entry);
    });
    await assertFails(getDoc(doc(client(), 'audit_logs/a1')));
  });

  it('allows an authenticated principal to append an entry naming itself', async () => {
    await assertSucceeds(setDoc(doc(client(), 'audit_logs/a2'), entry));
  });

  it('denies forging the actor on an audit entry', async () => {
    await assertFails(setDoc(doc(client(), 'audit_logs/a3'), { action: 'login', timestamp: '2026-08-19', actorUid: 'owner_uid' }));
  });

  it('denies update and delete to everyone including admin', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'audit_logs/a4'), entry);
    });
    await assertFails(updateDoc(doc(owner(), 'audit_logs/a4'), { action: 'nothing' }));
    await assertFails(deleteDoc(doc(owner(), 'audit_logs/a4')));
  });
});

describe('REQ-006 notifications', () => {
  it('denies creating a notification in another principal feed', async () => {
    await assertFails(setDoc(doc(stranger(), 'notifications/n1'), { userId: 'owner_uid', title: 't', message: 'm', type: 'alert', read: false }));
  });
});

describe('REQ-007 meetings', () => {
  const meeting = { title: 'Client strategy', meetingUri: 'https://meet.example/abc', meetingCode: 'abc', status: 'scheduled', createdAt: '2026-08-19', hostUid: 'client_uid' };

  it('denies an unrelated account reading a meeting', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'meetings/m1'), meeting);
    });
    await assertFails(getDoc(doc(stranger(), 'meetings/m1')));
  });

  it('denies creating a meeting hosted by someone else', async () => {
    await assertFails(setDoc(doc(stranger(), 'meetings/m2'), meeting));
  });
});

describe('REQ-008 estimates', () => {
  const estimate = { engagementId: 'eng_1', vertical: 'medicare-agency', quotedAmount: 3000, outcome: 'delivered_discounted', createdAt: '2026-08-19' };

  it('denies a client reading or writing estimates', async () => {
    await assertFails(setDoc(doc(client(), 'estimates/e1'), estimate));
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'estimates/e1'), estimate);
    });
    await assertFails(getDoc(doc(client(), 'estimates/e1')));
  });

  it('allows an operator to write an estimate', async () => {
    await assertSucceeds(setDoc(doc(owner(), 'estimates/e2'), estimate));
  });
});

describe('baseline', () => {
  it('denies anonymous access everywhere', async () => {
    await assertFails(getDoc(doc(anon(), 'users/client_uid')));
    await assertFails(getDoc(doc(anon(), 'invoices/any')));
    await assertFails(getDoc(doc(anon(), 'verifications/any')));
  });

  it('denies access to an unmapped collection', async () => {
    await assertFails(setDoc(doc(owner(), 'not_a_real_collection/x'), { a: 1 }));
  });
});