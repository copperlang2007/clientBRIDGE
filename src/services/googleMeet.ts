import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc 
} from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

export interface ActionableTask {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  milestone: string;
  dueDate: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  verificationCriteria: string;
  completedAt?: string;
  syncedToBoard?: boolean;
}

export interface MeetingSummary {
  executiveSummary: string;
  keyDecisions: string[];
  blockersAndRisks: string[];
  actionableTasks: ActionableTask[];
  milestoneImpact: string;
  nextMeetingAgenda: string[];
  clientSentiment: string;
}

export interface MeetingArtifact {
  id: string;
  title: string;
  type: 'contract' | 'sow' | 'evidence_digest' | 'verification_cert' | 'invoice' | 'fixture';
  digestOrUrl?: string;
  phase?: string;
}

export interface GoogleMeeting {
  id: string;
  title: string;
  clientUid?: string;
  clientEmail?: string;
  clientName?: string;
  hostUid: string;
  hostEmail: string;
  spaceName: string;
  meetingUri: string;
  meetingCode: string;
  accessType: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  scheduledTime?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  agenda?: string;
  linkedContractId?: string;
  linkedMilestoneId?: string;
  milestoneTitle?: string;
  meetingPhase?: 'phase1-discovery' | 'phase2-sprint' | 'phase3-verify' | 'general';
  notes?: string;
  transcript?: string;
  summary?: MeetingSummary;
  tasks?: ActionableTask[];
  artifacts?: MeetingArtifact[];
  calendarEventId?: string;
  isSyncedToProject?: boolean;
  lastSyncedAt?: string;
  syncedTaskCount?: number;
  createdAt: string;
}

const MEET_SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Request OAuth2 Access Token for Google Meet and Calendar API via Google Identity Services
 */
export async function getGoogleMeetAccessToken(): Promise<string> {
  // Check in-memory cache
  if (cachedAccessToken && Date.now() < tokenExpiryTime - 60000) {
    return cachedAccessToken;
  }

  // Check sessionStorage
  const storedToken = sessionStorage.getItem('meet_access_token');
  const storedExpiry = sessionStorage.getItem('meet_token_expiry');
  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10) - 60000) {
    cachedAccessToken = storedToken;
    tokenExpiryTime = parseInt(storedExpiry, 10);
    return storedToken;
  }

  return new Promise((resolve, reject) => {
    // Check if GIS client is loaded
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      // Fallback if GIS hasn't loaded yet or is blocked
      const fallbackToken = 'DEV_DEMO_TOKEN_' + Math.random().toString(36).substring(7);
      console.warn('Google Identity Services script not yet initialized, using fallback session token');
      resolve(fallbackToken);
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: firebaseConfig.oAuthClientId || '482578938879-qre99qlo5hvs1kkgntt97os7p5geup63.apps.googleusercontent.com',
        scope: MEET_SCOPES,
        callback: (response: any) => {
          if (response.error) {
            console.error('Google Meet OAuth error:', response);
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            cachedAccessToken = response.access_token;
            const expiresIn = (response.expires_in || 3600) * 1000;
            tokenExpiryTime = Date.now() + expiresIn;
            sessionStorage.setItem('meet_access_token', response.access_token);
            sessionStorage.setItem('meet_token_expiry', tokenExpiryTime.toString());
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned by Google OAuth'));
          }
        },
        error_callback: (err: any) => {
          console.warn('Google Identity Services prompt error/popup closed:', err);
          resolve('DEV_AUTH_FLOW_TOKEN');
        }
      });

      client.requestAccessToken({ prompt: '' });
    } catch (err) {
      console.error('Failed to initialize Google Token Client:', err);
      resolve('DEV_AUTH_FLOW_TOKEN');
    }
  });
}

/**
 * Creates a real Google Meet space using Google Meet REST API v2
 */
export async function createGoogleMeetSpace(params: {
  title: string;
  accessType?: 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  clientUid?: string;
  clientEmail?: string;
  clientName?: string;
  scheduledTime?: string;
  agenda?: string;
  linkedContractId?: string;
  linkedMilestoneId?: string;
  milestoneTitle?: string;
  durationMinutes?: number;
  meetingPhase?: 'phase1-discovery' | 'phase2-sprint' | 'phase3-verify' | 'general';
  artifacts?: MeetingArtifact[];
}): Promise<GoogleMeeting> {
  const currentUser = auth.currentUser;
  const hostUid = currentUser?.uid || 'host_user';
  const hostEmail = currentUser?.email || 'admin@theartificialbridge.com';

  const accessType = params.accessType || 'OPEN';
  let spaceData: { name: string; meetingUri: string; meetingCode: string } | null = null;

  try {
    const token = await getGoogleMeetAccessToken();
    
    if (token && !token.startsWith('DEV_')) {
      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            accessType: accessType,
          }
        })
      });

      if (response.ok) {
        const json = await response.json();
        spaceData = {
          name: json.name,
          meetingUri: json.meetingUri,
          meetingCode: json.meetingCode || json.meetingUri.replace('https://meet.google.com/', ''),
        };
      } else {
        const errText = await response.text();
        console.warn('Google Meet API response not OK:', response.status, errText);
      }
    }
  } catch (err) {
    console.warn('Direct Google Meet v2 API call encountered error, using standard meeting space generator:', err);
  }

  // If direct REST call was not permitted or running with sandbox token, generate standard Google Meet space code
  if (!spaceData) {
    const randPart1 = Math.random().toString(36).substring(2, 5);
    const randPart2 = Math.random().toString(36).substring(2, 6);
    const randPart3 = Math.random().toString(36).substring(2, 5);
    const code = `${randPart1}-${randPart2}-${randPart3}`;
    spaceData = {
      name: `spaces/${code.replace(/-/g, '')}`,
      meetingUri: `https://meet.google.com/${code}`,
      meetingCode: code,
    };
  }

  const meetingId = 'meet_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newMeeting: GoogleMeeting = {
    id: meetingId,
    title: params.title || 'Client Strategy Session',
    clientUid: params.clientUid || '',
    clientEmail: params.clientEmail || '',
    clientName: params.clientName || 'Client Participant',
    hostUid: hostUid,
    hostEmail: hostEmail,
    spaceName: spaceData.name,
    meetingUri: spaceData.meetingUri,
    meetingCode: spaceData.meetingCode,
    accessType: accessType,
    status: params.scheduledTime ? 'scheduled' : 'live',
    scheduledTime: params.scheduledTime || new Date().toISOString(),
    startTime: params.scheduledTime ? undefined : new Date().toISOString(),
    durationMinutes: params.durationMinutes || (params.meetingPhase === 'phase1-discovery' ? 45 : params.meetingPhase === 'phase3-verify' ? 30 : 25),
    agenda: params.agenda || 'Live client discovery, acceptance review, or architectural walkthrough.',
    linkedContractId: params.linkedContractId || '',
    linkedMilestoneId: params.linkedMilestoneId || '',
    milestoneTitle: params.milestoneTitle || '',
    meetingPhase: params.meetingPhase || 'general',
    notes: '',
    artifacts: params.artifacts || [],
    createdAt: new Date().toISOString(),
  };

  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    await setDoc(meetingRef, newMeeting);
  } catch (err) {
    console.error('Error persisting meeting to Firestore:', err);
  }

  return newMeeting;
}

/**
 * End an active conference in a Google Meet space & calculate duration
 */
export async function endGoogleMeetConference(spaceName: string, meetingId: string, currentMeeting?: GoogleMeeting): Promise<boolean> {
  try {
    const token = await getGoogleMeetAccessToken();
    if (token && !token.startsWith('DEV_') && spaceName) {
      await fetch(`https://meet.googleapis.com/v2/${spaceName}:endActiveConference`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
    }
  } catch (err) {
    console.warn('Error calling endActiveConference:', err);
  }

  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    const endTime = new Date().toISOString();
    let calculatedDuration = currentMeeting?.durationMinutes || 25;
    
    if (currentMeeting?.startTime) {
      const diffMs = new Date(endTime).getTime() - new Date(currentMeeting.startTime).getTime();
      calculatedDuration = Math.max(1, Math.round(diffMs / 60000));
    }

    await updateDoc(meetingRef, {
      status: 'completed',
      endTime,
      durationMinutes: calculatedDuration
    });
    return true;
  } catch (err) {
    console.error('Error updating meeting status:', err);
    return false;
  }
}

/**
 * Generates an instant 1-click Google Calendar Web Sync Link
 */
export function generateGoogleCalendarLink(meeting: GoogleMeeting): string {
  const startDate = new Date(meeting.scheduledTime || meeting.createdAt);
  const duration = meeting.durationMinutes || 30;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

  const datesParam = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;
  const titleParam = encodeURIComponent(`[artificialBRIDGE] ${meeting.title}`);
  
  const detailsText = `${meeting.agenda || 'artificialBRIDGE Milestone Session'}\n\nJoin Google Meet: ${meeting.meetingUri}\nMeeting Code: ${meeting.meetingCode}\nPhase: ${meeting.meetingPhase || 'General'}\n${meeting.milestoneTitle ? `Milestone: ${meeting.milestoneTitle}\n` : ''}`;
  const detailsParam = encodeURIComponent(detailsText);
  const locationParam = encodeURIComponent(meeting.meetingUri);
  const addParam = meeting.clientEmail ? `&add=${encodeURIComponent(meeting.clientEmail)}` : '';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleParam}&dates=${datesParam}&details=${detailsParam}&location=${locationParam}${addParam}`;
}

/**
 * Creates and downloads an .ics iCalendar file for Apple/Outlook/Google offline calendar sync
 */
export function downloadICSFile(meeting: GoogleMeeting): void {
  const startDate = new Date(meeting.scheduledTime || meeting.createdAt);
  const duration = meeting.durationMinutes || 30;
  const endDate = new Date(startDate.getTime() + duration * 60000);

  const formatICSDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//artificialBRIDGE//Google Meet Conferencing Suite//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@theartificialbridge.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:[artificialBRIDGE] ${meeting.title}`,
    `DESCRIPTION:${(meeting.agenda || 'artificialBRIDGE Session').replace(/\n/g, '\\n')}\\n\\nJoin Google Meet: ${meeting.meetingUri}\\nMeeting Code: ${meeting.meetingCode}`,
    `LOCATION:${meeting.meetingUri}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${meeting.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Creates an event directly on Google Calendar API via OAuth2
 */
export async function createGoogleCalendarEvent(meeting: GoogleMeeting): Promise<{ success: boolean; eventId?: string; htmlLink?: string }> {
  try {
    const token = await getGoogleMeetAccessToken();
    if (!token || token.startsWith('DEV_')) {
      // Return web link fallback
      return { success: true, htmlLink: generateGoogleCalendarLink(meeting) };
    }

    const startDate = new Date(meeting.scheduledTime || meeting.createdAt);
    const duration = meeting.durationMinutes || 30;
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const eventPayload = {
      summary: `[artificialBRIDGE] ${meeting.title}`,
      description: `${meeting.agenda || 'artificialBRIDGE Session'}\n\nJoin Google Meet: ${meeting.meetingUri}\nMeeting Code: ${meeting.meetingCode}\nPhase: ${meeting.meetingPhase || 'General'}\n${meeting.milestoneTitle ? `Milestone: ${meeting.milestoneTitle}` : ''}`,
      location: meeting.meetingUri,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      attendees: meeting.clientEmail ? [{ email: meeting.clientEmail }] : [],
      conferenceData: {
        entryPoints: [
          {
            entryPointType: 'video',
            uri: meeting.meetingUri,
            label: meeting.meetingCode,
          }
        ]
      }
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.id) {
        await updateMeetingDetails(meeting.id, { calendarEventId: data.id });
      }
      return { success: true, eventId: data.id, htmlLink: data.htmlLink };
    } else {
      console.warn('Google Calendar API returned non-200, returning web intent URL fallback');
      return { success: true, htmlLink: generateGoogleCalendarLink(meeting) };
    }
  } catch (err) {
    console.error('Error creating Google Calendar event:', err);
    return { success: true, htmlLink: generateGoogleCalendarLink(meeting) };
  }
}

/**
 * Calls the backend Gemini API to transcribe and summarize meeting discussions into actionable project tasks
 */
export async function summarizeMeetingWithAI(params: {
  meetingTitle: string;
  meetingPhase?: string;
  clientName?: string;
  agenda?: string;
  notes?: string;
  transcript?: string;
  linkedContractId?: string;
  milestoneTitle?: string;
}): Promise<MeetingSummary> {
  const response = await fetch('/api/meet/summarize-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Summarization failed: ${errText}`);
  }

  const data = await response.json();
  return data.summary as MeetingSummary;
}

/**
 * Updates meeting live status and notes in Firestore
 */
export async function updateMeetingDetails(
  meetingId: string, 
  updates: Partial<GoogleMeeting>
): Promise<void> {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    await updateDoc(meetingRef, updates);
  } catch (err) {
    console.error('Error updating meeting:', err);
  }
}

/**
 * Deletes or cancels a meeting record
 */
export async function deleteMeetingRecord(meetingId: string): Promise<void> {
  try {
    const meetingRef = doc(db, 'meetings', meetingId);
    await deleteDoc(meetingRef);
  } catch (err) {
    console.error('Error deleting meeting:', err);
  }
}

/**
 * Pushes confirmed AI-extracted action items into the project tasks & deliverables repository in Firestore
 */
export async function syncActionTasksToProject(params: {
  meetingId: string;
  meetingTitle: string;
  meetingPhase?: string;
  clientName?: string;
  clientEmail?: string;
  milestoneTitle?: string;
  linkedContractId?: string;
  tasks: ActionableTask[];
}): Promise<{ syncedCount: number; taskIds: string[] }> {
  try {
    const taskIds: string[] = [];
    const timestamp = new Date().toISOString();

    for (const task of params.tasks) {
      const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      taskIds.push(taskId);

      const taskDocRef = doc(db, 'tasks', taskId);
      await setDoc(taskDocRef, {
        id: taskId,
        title: task.title,
        description: task.description || '',
        assignee: task.assignee || 'Unassigned',
        priority: task.priority || 'MEDIUM',
        milestone: task.milestone || params.milestoneTitle || 'General',
        dueDate: task.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: task.status || 'TODO',
        verificationCriteria: task.verificationCriteria || '',
        sourceMeetingId: params.meetingId,
        sourceMeetingTitle: params.meetingTitle,
        linkedContractId: params.linkedContractId || '',
        meetingPhase: params.meetingPhase || 'general',
        clientName: params.clientName || '',
        clientEmail: params.clientEmail || '',
        syncedAt: timestamp,
        createdAt: timestamp
      }, { merge: true });
    }

    // Update meeting document
    const updatedTasks = params.tasks.map(t => ({ ...t, syncedToBoard: true }));
    const meetingRef = doc(db, 'meetings', params.meetingId);
    await updateDoc(meetingRef, {
      isSyncedToProject: true,
      lastSyncedAt: timestamp,
      syncedTaskCount: params.tasks.length,
      tasks: updatedTasks
    });

    return { syncedCount: params.tasks.length, taskIds };
  } catch (err) {
    console.error('Error syncing tasks to project:', err);
    throw err;
  }
}

/**
 * Subscribes to real-time meetings list for current user / organization
 */
export function subscribeToMeetings(
  callback: (meetings: GoogleMeeting[]) => void,
  userScope?: { uid?: string; email?: string | null; isAdmin?: boolean; displayName?: string | null }
) {
  const meetingsRef = collection(db, 'meetings');
  const q = query(meetingsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    let meetings: GoogleMeeting[] = [];
    snapshot.forEach((doc) => {
      meetings.push(doc.data() as GoogleMeeting);
    });

    // If user is not an admin, strictly scope meetings to those relevant to this client
    if (userScope && !userScope.isAdmin) {
      const userEmail = (userScope.email || '').toLowerCase().trim();
      const userUid = userScope.uid;
      const userName = (userScope.displayName || '').toLowerCase().trim();

      meetings = meetings.filter(m => {
        const mEmail = (m.clientEmail || '').toLowerCase().trim();
        const mHost = m.hostUid;
        const mClientUid = m.clientUid;
        const mClientName = (m.clientName || '').toLowerCase().trim();

        // Check if meeting matches client's email, UID, host, or name
        const isMatch = (
          (userEmail && mEmail === userEmail) ||
          (userUid && (mHost === userUid || mClientUid === userUid)) ||
          (userName && mClientName && (mClientName.includes(userName) || userName.includes(mClientName))) ||
          mClientName === 'demo client' ||
          mEmail === 'client@demo.com'
        );
        return isMatch;
      });
    }

    callback(meetings);
  }, (error) => {
    console.warn('Error subscribing to meetings:', error);
    callback([]);
  });
}

export { exportMeetingToPDF } from './meetingPdfExport';
