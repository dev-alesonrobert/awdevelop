import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { ProposalDraft } from './proposal.models';
import { proposalError } from './proposal.models';

const purple = rgb(127 / 255, 97 / 255, 245 / 255);
const ink = rgb(.13, .13, .18);
const muted = rgb(.38, .38, .44);
const WIDTH = 595.28, HEIGHT = 841.89, MARGIN = 48, LINE = 17;

// Measure every line, including unbroken URLs, to keep all content inside A4 margins.
export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? line + ' ' + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const char of word) {
        if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ''; }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export async function createProposalPdf(draft: ProposalDraft, quoteId: string, now = new Date()): Promise<Uint8Array> {
  const error = proposalError(draft);
  if (error) throw new Error(error);
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const text = (value: string) => {
    value = value.normalize('NFC').replace(/\t/g, '    ').replace(/[\u2010-\u2015]/g, '-');
    try { regular.encodeText(value.replace(/[\r\n]/g, '')); }
    catch { throw new Error('Há um caractere não suportado no documento. Substitua emojis ou símbolos especiais e tente novamente.'); }
    return value;
  };
  const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, typeof value === 'string' ? text(value.trim()) : value])) as unknown as ProposalDraft;
  const reference = 'AW-Q' + quoteId.replace(/[^0-9]/g, '').slice(0, 20);
  document.setTitle('Proposta comercial - ' + values.title);
  document.setAuthor('AW Develop'); document.setSubject('Proposta ' + reference);
  document.setCreationDate(now);
  let page = document.addPage([WIDTH, HEIGHT]);
  let y = HEIGHT - MARGIN;
  const newPage = () => {
    if (document.getPageCount() > 1 || y !== HEIGHT - MARGIN) page = document.addPage([WIDTH, HEIGHT]);
    page.drawRectangle({ x: MARGIN, y: HEIGHT - 43, width: 28, height: 4, color: purple });
    page.drawText('AW DEVELOP', { x: MARGIN, y: HEIGHT - 65, size: 12, font: bold, color: ink });
    page.drawText(reference, { x: WIDTH - MARGIN - regular.widthOfTextAtSize(reference, 9), y: HEIGHT - 65, size: 9, font: regular, color: muted });
    y = HEIGHT - 105;
  };
  newPage();
  const ensure = (height: number) => { if (y - height < 65) newPage(); };
  const paragraph = (content: string, size = 11, font = regular, color = ink) => {
    const lineHeight = Math.max(LINE, size * 1.35);
    for (const line of wrapText(content, font, size, WIDTH - MARGIN * 2)) {
      ensure(lineHeight); if (line) page.drawText(line, { x: MARGIN, y, font, size, color }); y -= lineHeight;
    }
  };
  const section = (label: string, body: string) => {
    ensure(62); y -= 15; paragraph(label.toUpperCase(), 9, bold, purple); y -= 4; paragraph(body);
  };
  paragraph('PROPOSTA COMERCIAL', 9, bold, purple); y -= 9;
  paragraph(values.title, 23, bold); y -= 12;
  paragraph('Para ' + values.client, 12, bold);
  if (values.company) paragraph(values.company, 11, regular, muted);
  const issued = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(now);
  const validity = values.validUntil.split('-').reverse().join('/');
  y -= 7; paragraph('Emitida em ' + issued + '  |  Válida até ' + validity, 9, regular, muted);
  section('01 / Escopo e entregas', values.scope);
  section('02 / Prazo e início', values.deadline);
  ensure(96); y -= 15;
  page.drawRectangle({ x: MARGIN, y: y - 59, width: WIDTH - MARGIN * 2, height: 68, color: rgb(.96, .95, 1) });
  page.drawText('03 / INVESTIMENTO', { x: MARGIN + 16, y: y - 9, size: 9, font: bold, color: purple });
  page.drawText(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(values.amount!), { x: MARGIN + 16, y: y - 37, size: 24, font: bold, color: ink });
  y -= 76;
  section('04 / Condições de pagamento', values.conditions);
  const pages = document.getPages();
  pages.forEach((item, index) => {
    item.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: WIDTH - MARGIN, y: 48 }, thickness: .5, color: rgb(.85, .85, .89) });
    item.drawText('AW Develop  /  awdevelop.com', { x: MARGIN, y: 32, size: 8, font: regular, color: muted });
    const count = `${index + 1} / ${pages.length}`;
    item.drawText(count, { x: WIDTH - MARGIN - regular.widthOfTextAtSize(count, 8), y: 32, size: 8, font: regular, color: muted });
  });
  return document.save();
}
