import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import { GenerateReport } from '../../src/application/use-cases/reports/generate-report';
import { TemplateReportWriter } from '../../src/infrastructure/reports/template-report-writer';
import { reportInputSchema } from '@askod/shared';
import type { Document } from '../../src/domain';
import JSZip from 'jszip';
import styledAppendices from '../../templates/reports/styled-appendices.json';
import styledWord from '../../templates/reports/styled-word.json';

function formattingRecords(bytes: Uint8Array) {
  const cfb = XLSX.CFB.read(Buffer.from(bytes), { type: 'buffer' });
  const stream = Buffer.from(XLSX.CFB.find(cfb, 'Workbook').content);
  const result: string[] = [];
  for (let offset = 0; offset + 4 <= stream.length;) {
    const id = stream.readUInt16LE(offset),
      size = stream.readUInt16LE(offset + 2);
    if (!id && !size) break;
    if (
      [0x31, 0xe0, 0x7d, 0x208, 0xe5, 0x26, 0x27, 0x28, 0x29, 0xa1].includes(id)
    )
      result.push(stream.subarray(offset, offset + 4 + size).toString('hex'));
    offset += 4 + size;
  }
  return result;
}
const input = {
  id: 'journal' as const,
  from: '2026-01-01',
  to: '2026-03-31',
  organization: 'Тестова організація',
};
describe('report templates', () => {
  it.each([1, 2, 3, 4])(
    'exports appendix %s as genuine XLS without sample measurements',
    async (number) => {
      const between = vi.fn();
      const bytes = await new GenerateReport(
        { between },
        new TemplateReportWriter(),
      ).execute({ ...input, id: `appendix-${number}` as 'appendix-1' });
      expect(Array.from(bytes.slice(0, 8))).toEqual([
        208, 207, 17, 224, 161, 177, 26, 225,
      ]);
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
      expect(sheet.A2.v).toBe(input.organization);
      expect(sheet.A7.v).toContain('31.03.2026');
      expect(sheet.B12.v).toBeTruthy();
      expect(sheet.C12?.v).toBeUndefined();
      expect(between).not.toHaveBeenCalled();
      expect(formattingRecords(bytes)).toEqual(
        formattingRecords(Buffer.from(styledAppendices[number - 1]!, 'base64')),
      );
    },
  );
  it('leaves ambiguous journal indicators and outcomes blank', async () => {
    const write = vi.fn().mockResolvedValue(new Uint8Array());
    const between = vi.fn().mockResolvedValue([
      {
        registrationNumber: 'Л-1',
        receivedVia: 'АСКОД',
        documentType: 'Скарга',
        reviewResult: 'невідоме',
      } as Document,
    ]);
    await new GenerateReport({ between }, { write }).execute(input);
    expect(between).toHaveBeenCalledWith(input.from, input.to);
    expect(write.mock.calls[0]![0].rows).toEqual([
      ['Л-1', null, null, null, null, null, 1, null, null, null, null],
    ]);
  });
  it.each(['journal', 'public-information'] as const)(
    'exports %s as OOXML DOCX',
    async (id) => {
      const bytes = await new GenerateReport(
        { between: async () => [] },
        new TemplateReportWriter(),
      ).execute({ ...input, id });
      expect(Array.from(bytes.slice(0, 4))).toEqual([80, 75, 3, 4]);
      expect(
        Buffer.from(bytes).includes(Buffer.from('word/document.xml')),
      ).toBe(true);
    },
  );
  it('rejects impossible dates and reversed periods', () => {
    expect(
      reportInputSchema.safeParse({ ...input, from: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      reportInputSchema.safeParse({ ...input, to: '2025-01-01' }).success,
    ).toBe(false);
  });
  it('preserves Word styles and repeats the original journal row without interpreting user text as XML', async () => {
    const writer = new TemplateReportWriter();
    const output = await writer.write({
      input: { ...input, organization: 'Організація <А> & Б' },
      rows: [
        ['ТЕСТ-1', 1],
        ['ТЕСТ-2', null],
      ],
    });
    const actual = await JSZip.loadAsync(output);
    const original = await JSZip.loadAsync(
      Buffer.from(styledWord.journal, 'base64'),
    );
    expect(await actual.file('word/styles.xml')!.async('string')).toBe(
      await original.file('word/styles.xml')!.async('string'),
    );
    const xml = await actual.file('word/document.xml')!.async('string');
    expect(xml).toContain('Організація &lt;А&gt; &amp; Б');
    expect(xml).toContain('ТЕСТ-1');
    expect(xml).toContain('ТЕСТ-2');
    expect(xml).not.toContain('{{');
    expect(xml.match(/<w:tr[ >]/g)).toHaveLength(4);
  });
});
