/**
 * Volunteer-application downloads: a formatted Excel workbook or a tabled PDF.
 *
 * Browser-only. The heavy libraries (exceljs, jspdf) are loaded on demand so
 * they never weigh down the dashboard until someone actually downloads.
 */
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  VolunteerApplication,
  VolunteerCall,
  positionName,
} from './volunteers';

export type ExportFormat = 'xlsx' | 'pdf';
/** `applicants` = review list (all details); `team` = selected volunteers grouped by position. */
export type ExportKind = 'applicants' | 'team';

export interface ExportRequest {
  format: ExportFormat;
  kind: ExportKind;
  apps: VolunteerApplication[];
  callsById: Record<string, VolunteerCall>;
  /** Heading printed at the top of the sheet / PDF. */
  title: string;
  /** Short description of what is included, e.g. "Filtered: Shortlisted". */
  scope?: string;
  /** File name without extension. */
  filename: string;
}

const BRAND = '00629B'; // IEEE blue
const BRAND_DARK = '003A5D';
const ORG = 'IEEE Computer Society — SUSL Student Branch Chapter';

const STATUS_STYLE: Record<ApplicationStatus, { fill: string; text: string }> = {
  pending: { fill: 'DBEAFE', text: '1E40AF' },
  shortlisted: { fill: 'FEF3C7', text: '92400E' },
  selected: { fill: 'D1FAE5', text: '065F46' },
  rejected: { fill: 'FEE2E2', text: '991B1B' },
};

const statusLabel = (s: ApplicationStatus) => APPLICATION_STATUSES.find((x) => x.key === s)?.label || s;
const prefRole = (r?: string) => (r === 'lead' ? 'Lead' : r === 'either' ? 'Lead or member' : 'Member');
const teamRole = (r?: string) => (r === 'lead' ? 'Team lead' : r === 'member' ? 'Team member' : '');
const answerText = (v: unknown) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v));
const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const safeName = (s: string) => s.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 120);

// ─────────────────────────────────────────────────────────────
// Column model shared by both formats
// ─────────────────────────────────────────────────────────────
type CellValue = string | number | Date;
interface Column {
  header: string;
  /** Excel column width in characters. */
  width: number;
  value: (a: VolunteerApplication, i: number) => CellValue;
  /** Long free text → wrap in Excel. */
  wrap?: boolean;
  status?: boolean;
  date?: boolean;
}

/** Selected team, ordered by position (call order), leads first, then by name. */
function teamOrder(apps: VolunteerApplication[], callsById: Record<string, VolunteerCall>) {
  const posIndex = (a: VolunteerApplication) => {
    const i = callsById[a.callId]?.positions.findIndex((p) => p.id === a.assignedPosition) ?? -1;
    return i < 0 ? 999 : i;
  };
  return [...apps].sort(
    (a, b) =>
      a.callId.localeCompare(b.callId) ||
      posIndex(a) - posIndex(b) ||
      (a.assignedRole === 'lead' ? 0 : 1) - (b.assignedRole === 'lead' ? 0 : 1) ||
      a.name.localeCompare(b.name)
  );
}

function buildColumns(req: ExportRequest, forPdf: boolean): { columns: Column[]; rows: VolunteerApplication[] } {
  const { apps, callsById, kind } = req;
  const multiCall = new Set(apps.map((a) => a.callId)).size > 1;
  const callOf = (a: VolunteerApplication) => callsById[a.callId];
  const cols: Column[] = [{ header: 'No.', width: 6, value: (_a, i) => i + 1 }];
  if (multiCall) cols.push({ header: 'Volunteer call', width: 28, value: (a) => callOf(a)?.title || a.callId, wrap: true });

  if (kind === 'team') {
    const rows = teamOrder(apps, callsById);
    cols.push(
      { header: 'Position', width: 24, value: (a) => positionName(callOf(a), a.assignedPosition) || 'Not assigned', wrap: true },
      { header: 'Role', width: 14, value: (a) => teamRole(a.assignedRole) || 'Team member' },
      { header: 'Name', width: 26, value: (a) => a.name, wrap: true },
      { header: 'Email', width: 32, value: (a) => a.email },
      { header: 'Phone', width: 16, value: (a) => a.phone || '' },
      { header: 'Student ID', width: 16, value: (a) => a.studentId || '' },
      { header: 'Faculty', width: 24, value: (a) => a.faculty || '', wrap: true },
      { header: 'Academic year', width: 14, value: (a) => a.academicYear || '' },
    );
    if (!forPdf) cols.push({ header: 'Reviewer notes', width: 40, value: (a) => a.notes || '', wrap: true });
    return { columns: cols, rows };
  }

  const rows = [...apps].sort((a, b) => a.createdAt - b.createdAt);
  if (forPdf) {
    // A page is only so wide: keep the essentials and fold related fields together.
    cols.push(
      { header: 'Name', width: 0, value: (a) => a.name },
      { header: 'Contact', width: 0, value: (a) => [a.email, a.phone].filter(Boolean).join('\n') },
      { header: 'Student ID', width: 0, value: (a) => a.studentId || '' },
      { header: 'Faculty / Year', width: 0, value: (a) => [a.faculty, a.academicYear].filter(Boolean).join('\n') },
      {
        header: 'Preferences',
        width: 0,
        value: (a) => (a.positions || []).map((p, i) => `${i + 1}. ${positionName(callOf(a), p)}`).join('\n'),
      },
      { header: 'Wants to', width: 0, value: (a) => prefRole(a.preferredRole) },
      { header: 'Status', width: 0, value: (a) => statusLabel(a.status), status: true },
      {
        header: 'Assigned',
        width: 0,
        value: (a) =>
          a.status === 'selected' && a.assignedPosition
            ? `${positionName(callOf(a), a.assignedPosition)}\n${teamRole(a.assignedRole)}`
            : '',
      },
      { header: 'Applied', width: 0, value: (a) => new Date(a.createdAt).toLocaleDateString() },
    );
    return { columns: cols, rows };
  }

  const maxPrefs = Math.max(1, ...apps.map((a) => a.positions?.length || 0));
  const questions = multiCall ? [] : callOf(apps[0])?.questions || [];
  cols.push(
    { header: 'Submitted', width: 19, value: (a) => new Date(a.createdAt), date: true },
    { header: 'Name', width: 26, value: (a) => a.name, wrap: true },
    { header: 'Email', width: 32, value: (a) => a.email },
    { header: 'Phone', width: 16, value: (a) => a.phone || '' },
    { header: 'Student ID', width: 16, value: (a) => a.studentId || '' },
    { header: 'Faculty', width: 24, value: (a) => a.faculty || '', wrap: true },
    { header: 'Academic year', width: 14, value: (a) => a.academicYear || '' },
    ...Array.from({ length: maxPrefs }, (_, i): Column => ({
      header: `Preference ${i + 1}`,
      width: 22,
      value: (a) => positionName(callOf(a), a.positions?.[i]),
      wrap: true,
    })),
    { header: 'Wants to be', width: 15, value: (a) => prefRole(a.preferredRole) },
    ...questions.map((q): Column => ({
      header: q.label,
      width: q.type === 'long' ? 45 : 24,
      value: (a) => answerText(a.answers?.[q.id]),
      wrap: true,
    })),
    { header: 'Status', width: 14, value: (a) => statusLabel(a.status), status: true },
    { header: 'Assigned position', width: 22, value: (a) => positionName(callOf(a), a.assignedPosition), wrap: true },
    { header: 'Assigned role', width: 14, value: (a) => teamRole(a.assignedRole) },
    { header: 'Reviewer notes', width: 40, value: (a) => a.notes || '', wrap: true },
  );
  return { columns: cols, rows };
}

// ─────────────────────────────────────────────────────────────
// Excel
// ─────────────────────────────────────────────────────────────
async function exportXlsx(req: ExportRequest) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = ORG;
  wb.created = new Date();

  const { columns, rows } = buildColumns(req, false);
  const sheetName = req.kind === 'team' ? 'Selected team' : 'Applicants';
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 4, xSplit: 0 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = columns.map((c) => ({ width: c.width }));
  const lastCol = columns.length;

  // Rows 1–2: title block
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = req.title;
  title.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_DARK } };
  title.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells(2, 1, 2, lastCol);
  const sub = ws.getCell(2, 1);
  sub.value = [ORG, req.scope, `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`, `Exported ${fmtDateTime(Date.now())}`]
    .filter(Boolean)
    .join('   •   ');
  sub.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  sub.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;

  // Row 4: header
  const header = ws.getRow(4);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF' + BRAND_DARK } } };
  });
  header.height = 30;

  const thin = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
  let prevGroup = '';
  rows.forEach((a, ri) => {
    const row = ws.getRow(5 + ri);
    const group = req.kind === 'team' ? `${a.callId}|${a.assignedPosition || ''}` : '';
    const newGroup = req.kind === 'team' && ri > 0 && group !== prevGroup;
    prevGroup = group;
    columns.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = c.value(a, ri);
      cell.alignment = { vertical: 'top', horizontal: ci === 0 ? 'center' : 'left', wrapText: !!c.wrap };
      cell.border = { top: newGroup ? { style: 'medium', color: { argb: 'FF94A3B8' } } : thin, bottom: thin, left: thin, right: thin };
      if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      if (c.date) cell.numFmt = 'dd mmm yyyy hh:mm';
      if (c.status) {
        const s = STATUS_STYLE[a.status];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + s.fill } };
        cell.font = { bold: true, color: { argb: 'FF' + s.text } };
        cell.alignment = { vertical: 'top', horizontal: 'center' };
      }
      if (req.kind === 'team' && c.header === 'Role' && a.assignedRole === 'lead') cell.font = { bold: true, color: { argb: 'FF6D28D9' } };
    });
  });

  if (rows.length > 0) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: lastCol } };

  addSummarySheet(wb, req);

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeName(req.filename)}.xlsx`
  );
}

/** Second sheet: totals by status and by position, ready to paste into a report. */
function addSummarySheet(wb: import('exceljs').Workbook, req: ExportRequest) {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [{ width: 34 }, { width: 14 }, { width: 14 }, { width: 14 }];
  const head = (r: number, labels: string[]) => {
    labels.forEach((l, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = l;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND } };
    });
  };
  ws.getCell(1, 1).value = req.title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF' + BRAND_DARK } };
  ws.getCell(2, 1).value = `${req.apps.length} records • exported ${fmtDateTime(Date.now())}`;
  ws.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };

  let r = 3;
  // A team export is all "Selected", so the status breakdown only adds noise there.
  if (req.kind === 'applicants') {
    head(++r, ['Status', 'Count', 'Share']);
    r++;
    APPLICATION_STATUSES.forEach((s) => {
      const n = req.apps.filter((a) => a.status === s.key).length;
      ws.getCell(r, 1).value = s.label;
      ws.getCell(r, 2).value = n;
      ws.getCell(r, 3).value = req.apps.length ? n / req.apps.length : 0;
      ws.getCell(r, 3).numFmt = '0%';
      r++;
    });
  }

  const calls = Array.from(new Set(req.apps.map((a) => a.callId))).map((id) => req.callsById[id]).filter(Boolean);
  calls.forEach((call) => {
    r++;
    if (calls.length > 1) {
      ws.getCell(r, 1).value = call.title;
      ws.getCell(r++, 1).font = { bold: true };
    }
    head(r++, ['Position', 'Applied (any pref.)', 'Selected', 'Places']);
    const mine = req.apps.filter((a) => a.callId === call.id);
    call.positions.forEach((p) => {
      ws.getCell(r, 1).value = p.name;
      ws.getCell(r, 2).value = mine.filter((a) => a.positions?.includes(p.id)).length;
      ws.getCell(r, 3).value = mine.filter((a) => a.status === 'selected' && a.assignedPosition === p.id).length;
      ws.getCell(r, 4).value = p.slots || '—';
      r++;
    });
  });
}

// ─────────────────────────────────────────────────────────────
// PDF
// ─────────────────────────────────────────────────────────────
const hex = (h: string): [number, number, number] => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];

/** Label / value pairs for one applicant: status first, then everything they submitted. */
function detailRows(a: VolunteerApplication, call: VolunteerCall | undefined, showCall: boolean): string[][] {
  const status =
    a.status === 'selected' && a.assignedPosition
      ? `Selected — ${positionName(call, a.assignedPosition)} (${teamRole(a.assignedRole) || 'Team member'})`
      : statusLabel(a.status);
  const rows: string[][] = [['Current status', status]];
  if (showCall) rows.push(['Volunteer call', call?.title || a.callId]);
  rows.push(
    ['Applied on', fmtDateTime(a.createdAt)],
    ['Email', a.email],
    ['Phone', a.phone || 'No answer'],
    ['Student ID', a.studentId || 'No answer'],
    ['Faculty', a.faculty || 'No answer'],
    ['Academic year', a.academicYear || 'No answer'],
    ['Position preferences', (a.positions || []).map((p, i) => `${i + 1}. ${positionName(call, p)}`).join('\n') || 'No answer'],
    ['Wants to be', prefRole(a.preferredRole)],
  );
  (call?.questions || []).forEach((q) => rows.push([q.label, answerText(a.answers?.[q.id]).trim() || 'No answer']));
  // Answers to questions that were later removed from the form are still shown.
  Object.keys(a.answers || {})
    .filter((k) => !call?.questions.some((q) => q.id === k))
    .forEach((k) => { const v = answerText(a.answers[k]).trim(); if (v) rows.push([`(Removed question) ${k}`, v]); });
  if (a.notes) rows.push(['Reviewer notes', a.notes]);
  if (a.reviewedBy) rows.push(['Last reviewed', `${a.reviewedBy}${a.reviewedAt ? ` · ${fmtDateTime(a.reviewedAt)}` : ''}`]);
  return rows;
}

async function exportPdf(req: ExportRequest) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 32;

  const { columns, rows } = buildColumns(req, true);
  const body = rows.map((a, i) => columns.map((c) => String(c.value(a, i))));

  // Title block (first page)
  doc.setFillColor(...hex(BRAND_DARK));
  doc.rect(0, 0, pageW, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(req.title, margin, 30, { maxWidth: pageW - margin * 2 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(ORG, margin, 48);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  const meta = [req.scope, `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`, `Exported ${fmtDateTime(Date.now())}`]
    .filter(Boolean)
    .join('   •   ');
  doc.text(meta, margin, 82);

  // Status counts as a compact line under the meta
  const counts = APPLICATION_STATUSES.map((s) => `${s.label}: ${req.apps.filter((a) => a.status === s.key).length}`).join('     ');
  if (req.kind === 'applicants') doc.text(counts, margin, 96);

  const statusCol = columns.findIndex((c) => c.status);
  const teamGroupCol = req.kind === 'team' ? columns.findIndex((c) => c.header === 'Position') : -1;
  const roleCol = req.kind === 'team' ? columns.findIndex((c) => c.header === 'Role') : -1;

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body,
    startY: req.kind === 'applicants' ? 108 : 96,
    margin: { left: margin, right: margin, top: 40, bottom: 36 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.5, overflow: 'linebreak' },
    headStyles: { fillColor: hex(BRAND), textColor: 255, fontStyle: 'bold', valign: 'middle' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: 'center', cellWidth: 24 } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const app = rows[data.row.index];
      if (data.column.index === statusCol) {
        const s = STATUS_STYLE[app.status];
        data.cell.styles.fillColor = hex(s.fill);
        data.cell.styles.textColor = hex(s.text);
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.halign = 'center';
      }
      if (data.column.index === teamGroupCol) data.cell.styles.fontStyle = 'bold';
      if (data.column.index === roleCol && app.assignedRole === 'lead') {
        data.cell.styles.textColor = [109, 40, 217];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Part 2: one full record per person — every question and answer ──
  // Portrait pages: a record is tall and narrow, so two usually fit per page.
  if (rows.length > 0) {
    // autoTable adds its own pages with doc.addPage(); make those portrait too.
    const addLandscape = doc.addPage.bind(doc);
    const addPortrait = () => addLandscape('a4', 'portrait');
    (doc as unknown as { addPage: () => unknown }).addPage = addPortrait;

    addPortrait();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const top = 44;
    const bottom = 40;
    const labelW = 165;
    const pad = 4.5;
    const fontSize = 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...hex(BRAND_DARK));
    doc.text(req.kind === 'team' ? 'Team member details' : 'Applicant details', margin, top + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Everything each person submitted, with their current review status. Numbers match the table above.', margin, top + 18);

    // Measure a record's height the same way autoTable will lay it out.
    const lineH = fontSize * doc.getLineHeightFactor();
    const measure = (details: string[][]) => {
      doc.setFontSize(fontSize);
      const valueW = pw - margin * 2 - labelW - pad * 2;
      return 24 + details.reduce((h, [label, value]) => {
        const l = (doc.splitTextToSize(label, labelW - pad * 2) as string[]).length;
        const v = (doc.splitTextToSize(value, valueW) as string[]).length;
        return h + Math.max(l, v) * lineH + pad * 2;
      }, 0);
    };

    const multiCall = new Set(rows.map((r) => r.callId)).size > 1;
    let y = top + 34;
    rows.forEach((a, i) => {
      const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
      if (i > 0 && lastY) y = lastY + 18;
      const details = detailRows(a, req.callsById[a.callId], multiCall);
      const height = measure(details);
      const fitsOnFreshPage = height <= ph - top - bottom;
      // Start on a new page if it won't fit here but would on its own page,
      // or if only a sliver of space is left.
      if ((y + height > ph - bottom && fitsOnFreshPage) || y > ph - bottom - 80) { addPortrait(); y = top; }
      const s = STATUS_STYLE[a.status];
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin, top, bottom },
        theme: 'grid',
        showHead: 'everyPage',
        rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize, cellPadding: pad, valign: 'top', lineColor: [226, 232, 240], lineWidth: 0.5, overflow: 'linebreak' },
        head: [[
          { content: `${i + 1}.  ${a.name}`, styles: { fillColor: hex(BRAND), textColor: 255, fontStyle: 'bold', fontSize: 11 } },
          { content: statusLabel(a.status), styles: { fillColor: hex(s.fill), textColor: hex(s.text), fontStyle: 'bold', halign: 'right', fontSize: 10 } },
        ]],
        body: details,
        columnStyles: {
          0: { cellWidth: labelW, fontStyle: 'bold', textColor: [71, 85, 105], fillColor: [248, 250, 252] },
          1: { textColor: [16, 24, 32] },
        },
        didParseCell: (data) => {
          if (data.section !== 'body' || data.column.index !== 1) return;
          if (data.cell.raw === 'No answer') {
            data.cell.styles.textColor = [148, 163, 184];
            data.cell.styles.fontStyle = 'italic';
          }
          if (data.row.index === 0) {
            data.cell.styles.textColor = hex(s.text);
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    });
    (doc as unknown as { addPage: typeof addLandscape }).addPage = addLandscape;
  }

  // Footer on every page (pages differ in orientation, so measure each one).
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(req.title, margin, h - 16, { maxWidth: w / 2 });
    doc.text(`Page ${p} of ${total}`, w - margin, h - 16, { align: 'right' });
  }

  doc.save(`${safeName(req.filename)}.pdf`);
}

// ─────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────
export async function exportApplications(req: ExportRequest): Promise<void> {
  if (req.format === 'xlsx') await exportXlsx(req);
  else await exportPdf(req);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
