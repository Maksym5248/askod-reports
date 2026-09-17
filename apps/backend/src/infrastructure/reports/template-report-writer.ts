import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type {
  ReportData,
  ReportWriter,
} from '../../application/use-cases/reports/generate-report';
import { fillStyledXls } from './styled-xls';
import appendices from '../../../templates/reports/styled-appendices.json';
import wordTemplates from '../../../templates/reports/styled-word.json';
const displayDate = (value: string) => value.split('-').reverse().join('.');
const wordNamespace =
  'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export class TemplateReportWriter implements ReportWriter {
  async write({ input, rows }: ReportData): Promise<Uint8Array> {
    const period = `За період з ${displayDate(input.from)} по ${displayDate(input.to)}`;
    if (input.id.startsWith('appendix-')) {
      const index = Number(input.id.slice(-1)) - 1;
      return fillStyledXls(
        Buffer.from(appendices[index]!, 'base64'),
        index === 0 ? 12 : 11,
        input.organization,
        period,
      );
    }
    const template = wordTemplates[input.id as keyof typeof wordTemplates];
    const zip = await JSZip.loadAsync(Buffer.from(template, 'base64'));
    const xml = await zip.file('word/document.xml')!.async('string');
    const document = new DOMParser().parseFromString(xml, 'text/xml');
    if (input.id === 'journal') {
      const table = document.getElementsByTagNameNS(wordNamespace, 'tbl')[0]!;
      const templateRow = table.getElementsByTagNameNS(wordNamespace, 'tr')[2]!;
      for (const values of rows.length ? rows : [Array(11).fill(null)]) {
        const row = templateRow.cloneNode(true);
        const elements = (row as typeof templateRow).getElementsByTagNameNS(
          wordNamespace,
          't',
        );
        for (let i = 0; i < elements.length; i++) {
          const node = elements[i]!;
          const match = /^\{\{cell(\d+)\}\}$/.exec(node.textContent ?? '');
          if (match) node.textContent = String(values[Number(match[1])] ?? '');
        }
        table.insertBefore(row, templateRow);
      }
      table.removeChild(templateRow);
    }
    const texts = document.getElementsByTagNameNS(wordNamespace, 't');
    for (let i = 0; i < texts.length; i++) {
      const node = texts[i]!;
      node.textContent = (node.textContent ?? '')
        .replaceAll('{{organization}}', input.organization)
        .replaceAll('{{period}}', period);
    }
    zip.file(
      'word/document.xml',
      new XMLSerializer().serializeToString(document),
    );
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }
}
