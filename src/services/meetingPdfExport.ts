import { jsPDF } from 'jspdf';
import { GoogleMeeting } from './googleMeet';

/**
 * Generates a polished, professional PDF report containing the meeting's
 * executive summary, key decisions, blockers, and structured actionable tasks table.
 */
export function exportMeetingToPDF(meeting: GoogleMeeting): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const primaryDark = [10, 10, 10]; // #0a0a0a
  const goldAccent = [212, 175, 55]; // #d4af37
  const textDark = [30, 30, 30];
  const textMuted = [100, 100, 100];
  const bgLight = [248, 248, 246];
  const borderLight = [225, 225, 220];

  // Helper to check page bounds and auto-add new page
  const checkAddPage = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 16) {
      doc.addPage();
      y = margin;
      drawHeaderWatermark();
    }
  };

  const drawHeaderWatermark = () => {
    // Top subtle gold bar
    doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.rect(0, 0, pageWidth, 3, 'F');
  };

  drawHeaderWatermark();

  // ----------------------------------------------------
  // 1. HEADER BANNER
  // ----------------------------------------------------
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');

  // Brand Name
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('artificialBRIDGE', margin + 6, y + 9);

  // Subtitle
  doc.setTextColor(230, 230, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('EXECUTIVE CLIENT CONFERENCE & ACTION ITEM REPORT', margin + 6, y + 15);

  // Metadata on right side of banner
  doc.setFontSize(7.5);
  doc.setTextColor(180, 180, 180);
  const dateStr = new Date(meeting.scheduledTime || meeting.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.text(`DATE: ${dateStr}`, pageWidth - margin - 6, y + 9, { align: 'right' });
  doc.text(`CODE: ${meeting.meetingCode || 'N/A'}`, pageWidth - margin - 6, y + 15, { align: 'right' });
  doc.text(`STATUS: ${(meeting.status || 'COMPLETED').toUpperCase()}`, pageWidth - margin - 6, y + 20, { align: 'right' });

  y += 29;

  // ----------------------------------------------------
  // 2. MEETING TITLE & METADATA SECTION
  // ----------------------------------------------------
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(meeting.title || 'Client Strategy Session', margin, y);
  y += 5;

  // Metadata Grid Box
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);

  const col1X = margin + 4;
  const col2X = margin + (contentWidth / 3);
  const col3X = margin + ((contentWidth / 3) * 2);

  // Row 1
  doc.text('CLIENT / ATTENDEE:', col1X, y + 5);
  doc.text('ENGAGEMENT PHASE:', col2X, y + 5);
  doc.text('MEETING ACCESS:', col3X, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(meeting.clientName ? `${meeting.clientName} (${meeting.clientEmail || 'N/A'})` : (meeting.clientEmail || 'General Participant'), col1X, y + 9);
  doc.text(formatPhaseLabel(meeting.meetingPhase), col2X, y + 9);
  doc.text(meeting.accessType || 'OPEN', col3X, y + 9);

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('LINKED MILESTONE:', col1X, y + 15);
  doc.text('DURATION / TIME:', col2X, y + 15);
  doc.text('GOOGLE MEET URI:', col3X, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text(meeting.milestoneTitle || 'General Core Delivery', col1X, y + 19);
  doc.text(`${meeting.durationMinutes || 30} mins · ${new Date(meeting.scheduledTime || meeting.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, col2X, y + 19);
  doc.text(meeting.meetingUri || 'https://meet.google.com', col3X, y + 19);

  y += 27;

  // ----------------------------------------------------
  // 3. AGENDA (If present)
  // ----------------------------------------------------
  if (meeting.agenda) {
    checkAddPage(20);
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.text('SESSION AGENDA & SCOPE', margin, y);
    y += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const agendaLines = doc.splitTextToSize(meeting.agenda, contentWidth - 8);
    const boxHeight = agendaLines.length * 4 + 6;
    
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1, 1, 'FD');
    doc.text(agendaLines, margin + 4, y + 4.5);
    y += boxHeight + 5;
  }

  // ----------------------------------------------------
  // 4. GEMINI AI EXECUTIVE SUMMARY
  // ----------------------------------------------------
  const summary = meeting.summary;
  if (summary) {
    checkAddPage(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('1. GEMINI AI EXECUTIVE SYNTHESIS', margin, y);
    y += 4;

    // Executive Summary Box
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    
    const summaryLines = doc.splitTextToSize(summary.executiveSummary || 'No executive summary provided.', contentWidth - 8);
    const sumBoxHeight = summaryLines.length * 3.8 + 6;
    
    doc.roundedRect(margin, y, contentWidth, sumBoxHeight, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(summaryLines, margin + 4, y + 4.5);
    y += sumBoxHeight + 5;

    // Key Decisions and Blockers (Two Column or Stacked)
    const hasDecisions = summary.keyDecisions && summary.keyDecisions.length > 0;
    const hasBlockers = summary.blockersAndRisks && summary.blockersAndRisks.length > 0;

    if (hasDecisions || hasBlockers) {
      checkAddPage(30);
      const halfWidth = (contentWidth - 4) / 2;

      // Key Decisions
      if (hasDecisions) {
        doc.setFillColor(240, 248, 244); // subtle green tint
        doc.setDrawColor(180, 220, 200);
        
        let decLines: string[] = [];
        summary.keyDecisions.forEach((d) => {
          const split = doc.splitTextToSize(`• ${d}`, halfWidth - 6);
          decLines = decLines.concat(split);
        });

        const decHeight = Math.max(decLines.length * 3.8 + 8, 20);
        doc.roundedRect(margin, y, halfWidth, decHeight, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(16, 120, 70);
        doc.text('KEY DECISIONS AGREED', margin + 3, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(decLines, margin + 3, y + 9);
      }

      // Blockers & Risks
      if (hasBlockers) {
        const blkX = hasDecisions ? margin + halfWidth + 4 : margin;
        const blkWidth = hasDecisions ? halfWidth : contentWidth;

        doc.setFillColor(254, 242, 242); // subtle rose tint
        doc.setDrawColor(245, 190, 190);

        let blkLines: string[] = [];
        summary.blockersAndRisks.forEach((b) => {
          const split = doc.splitTextToSize(`• ${b}`, blkWidth - 6);
          blkLines = blkLines.concat(split);
        });

        const blkHeight = Math.max(blkLines.length * 3.8 + 8, 20);
        doc.roundedRect(blkX, y, blkWidth, blkHeight, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 40, 40);
        doc.text('IDENTIFIED RISKS & BLOCKERS', blkX + 3, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(textDark[0], textDark[1], textDark[2]);
        doc.text(blkLines, blkX + 3, y + 9);
      }

      y += Math.max(
        hasDecisions ? (summary.keyDecisions.length * 4 + 10) : 0,
        hasBlockers ? (summary.blockersAndRisks.length * 4 + 10) : 0,
        22
      ) + 4;
    }

    // Milestone Impact (if present)
    if (summary.milestoneImpact) {
      checkAddPage(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('MILESTONE IMPACT:', margin, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(summary.milestoneImpact, margin + 32, y);
      y += 6;
    }
  }

  // ----------------------------------------------------
  // 5. ACTIONABLE TASKS & VERIFICATION TABLE
  // ----------------------------------------------------
  const tasks = meeting.tasks || summary?.actionableTasks || [];
  checkAddPage(30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`2. ACTIONABLE PROJECT TASKS & VERIFICATION DIRECTIVE (${tasks.length})`, margin, y);
  y += 4;

  if (tasks.length === 0) {
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.roundedRect(margin, y, contentWidth, 12, 1, 1, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('No actionable tasks recorded for this session.', margin + 4, y + 7.5);
    y += 16;
  } else {
    // Render Tasks Table Header
    doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    const colStatusX = margin + 2;
    const colTitleX = margin + 18;
    const colOwnerX = margin + 85;
    const colDueX = margin + 115;
    const colPriX = margin + 140;

    doc.text('STATUS', colStatusX, y + 4.5);
    doc.text('ACTION ITEM & VERIFICATION CRITERIA', colTitleX, y + 4.5);
    doc.text('OWNER', colOwnerX, y + 4.5);
    doc.text('DUE DATE', colDueX, y + 4.5);
    doc.text('PRIORITY', colPriX, y + 4.5);
    y += 6.5;

    // Render Table Rows
    tasks.forEach((task, idx) => {
      // Calculate row height
      const titleLines = doc.splitTextToSize(task.title, 64);
      const descText = task.description ? `Note: ${task.description}` : '';
      const verText = task.verificationCriteria ? `Proof: ${task.verificationCriteria}` : '';
      const subLines = doc.splitTextToSize([descText, verText].filter(Boolean).join(' | '), 64);

      const totalLinesCount = titleLines.length + (subLines.length > 0 ? subLines.length : 0);
      const rowHeight = Math.max(totalLinesCount * 3.5 + 4, 9);

      checkAddPage(rowHeight + 2);

      // Row zebra background
      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 250);
      } else {
        doc.setFillColor(244, 244, 240);
      }
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');

      // Status Checkbox
      const isDone = task.status === 'DONE';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (isDone) {
        doc.setTextColor(16, 120, 70);
        doc.text('[DONE]', colStatusX, y + 4.5);
      } else {
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('[TODO]', colStatusX, y + 4.5);
      }

      // Title & Description
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(titleLines, colTitleX, y + 4.5);

      if (subLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(subLines, colTitleX, y + 4.5 + (titleLines.length * 3.5));
      }

      // Owner
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text(task.assignee || 'Unassigned', colOwnerX, y + 4.5);

      // Due Date
      doc.text(task.dueDate || 'Sprint End', colDueX, y + 4.5);

      // Priority Badge text
      doc.setFont('helvetica', 'bold');
      if (task.priority === 'CRITICAL') {
        doc.setTextColor(180, 30, 30);
      } else if (task.priority === 'HIGH') {
        doc.setTextColor(180, 110, 20);
      } else {
        doc.setTextColor(40, 90, 180);
      }
      doc.text(task.priority || 'MEDIUM', colPriX, y + 4.5);

      y += rowHeight;
    });

    y += 5;
  }

  // ----------------------------------------------------
  // 6. SCRATCHPAD & TECHNICAL NOTES (If present)
  // ----------------------------------------------------
  if (meeting.notes) {
    checkAddPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text('3. CONFERENCE SCRATCHPAD & RECORDED BOUNDARY NOTES', margin, y);
    y += 4;

    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);

    const noteLines = doc.splitTextToSize(meeting.notes, contentWidth - 8);
    const noteHeight = Math.min(noteLines.length * 3.6 + 6, 80); // Cap if overly long

    doc.roundedRect(margin, y, contentWidth, noteHeight, 1, 1, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(noteLines.slice(0, 20), margin + 4, y + 4.5);
    y += noteHeight + 6;
  }

  // ----------------------------------------------------
  // 7. COMPLIANCE & SIGN-OFF BLOCK
  // ----------------------------------------------------
  checkAddPage(32);
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.text('DETERMINISTIC VERIFICATION & SOW COMPLIANCE SIGN-OFF', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(200, 200, 200);
  doc.text('This conference report records binding deliverables, milestone dates, and acceptance criteria in accordance with artificialBRIDGE Law 9.', margin + 4, y + 9.5);

  // Sign-off columns
  doc.setDrawColor(80, 80, 80);
  doc.line(margin + 4, y + 19, margin + 70, y + 19);
  doc.line(margin + 90, y + 19, margin + 156, y + 19);

  doc.setTextColor(160, 160, 160);
  doc.text('artificialBRIDGE Technical Lead Signature', margin + 4, y + 22);
  doc.text('Client Representative Approval Signature', margin + 90, y + 22);

  y += 28;

  // ----------------------------------------------------
  // 8. FOOTER WITH PAGE NUMBERS
  // ----------------------------------------------------
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      `artificialBRIDGE · Confidential Client Report · Meeting ID: ${meeting.id} · Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Sanitize filename
  const cleanTitle = (meeting.title || 'Meeting_Summary')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 40);
  const filename = `${cleanTitle}_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  // Trigger browser download
  doc.save(filename);
}

function formatPhaseLabel(phase?: string): string {
  switch (phase) {
    case 'phase1-discovery':
      return 'Phase 1: Discovery & Intake';
    case 'phase2-sprint':
      return 'Phase 2: Sprint Review';
    case 'phase3-verify':
      return 'Phase 3: Acceptance';
    default:
      return 'General Engagement';
  }
}
