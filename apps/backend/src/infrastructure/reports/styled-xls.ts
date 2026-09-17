import { CFB } from 'xlsx';

// A bounded BIFF8 template patcher. It retains the original formatting and print
// records; it is not a general XLS parser. Templates are trusted bundled assets.
const record = (id: number, data: Buffer) => {
  const header = Buffer.alloc(4);
  header.writeUInt16LE(id);
  header.writeUInt16LE(data.length, 2);
  return Buffer.concat([header, data]);
};
const label = (cell: Buffer, value: string) => {
  const data = Buffer.alloc(9 + value.length * 2);
  cell.copy(data, 0, 0, 6); // row, column, original XF style
  data.writeUInt16LE(value.length, 6);
  data[8] = 1;
  data.write(value, 9, 'utf16le');
  return record(0x204, data);
};

export function fillStyledXls(
  template: Uint8Array,
  dataStart: number,
  organization: string,
  period: string,
): Uint8Array {
  const cfb = CFB.read(Buffer.from(template), { type: 'buffer' });
  const entry = CFB.find(cfb, 'Workbook');
  if (!entry) throw new Error('Missing template Workbook stream');
  const source = Buffer.from(entry.content);
  const records: Array<{ id: number; offset: number; bytes: Buffer }> = [];
  for (let offset = 0; offset + 4 <= source.length;) {
    const id = source.readUInt16LE(offset),
      size = source.readUInt16LE(offset + 2);
    if (id === 0 && size === 0) break;
    if (offset + 4 + size > source.length)
      throw new Error('Invalid BIFF template');
    records.push({
      id,
      offset,
      bytes: Buffer.from(source.subarray(offset, offset + 4 + size)),
    });
    offset += 4 + size;
  }
  const sheetOffsets = records
    .filter((r) => r.id === 0x85)
    .map((r) => r.bytes.readUInt32LE(4));
  const first = sheetOffsets[0];
  if (first === undefined) throw new Error('Missing template worksheet');
  const end = sheetOffsets[1] ?? source.length;
  const offsetMap = new Map<number, number>();
  const output: Buffer[] = [];
  let position = 0;
  for (const rec of records) {
    offsetMap.set(rec.offset, position);
    // Optional seek indexes contain absolute stream positions. Readers rebuild
    // these when absent. All visual and print records are copied unchanged.
    if ([0x20b, 0xd7, 0xff].includes(rec.id)) continue;
    let bytes = rec.bytes;
    if (rec.offset >= first && rec.offset < end) {
      const cell = bytes.subarray(4);
      if (
        [0xfd, 0x204, 0x203, 0x27e, 0x6, 0x201, 0x205].includes(rec.id) &&
        cell.length >= 6
      ) {
        const row = cell.readUInt16LE(0),
          col = cell.readUInt16LE(2);
        if (col === 0 && (row === 1 || row === 6))
          bytes = label(cell, row === 1 ? organization : period);
        else if (row >= dataStart - 1 && col >= 2)
          bytes = record(0x201, cell.subarray(0, 6));
      } else if (rec.id === 0xbd && cell.readUInt16LE(0) >= dataStart - 1) {
        const row = cell.readUInt16LE(0),
          start = cell.readUInt16LE(2),
          last = cell.readUInt16LE(cell.length - 2);
        const replacements: Buffer[] = [];
        for (let col = start; col <= last; col++) {
          const value = Buffer.alloc(10);
          value.writeUInt16LE(row);
          value.writeUInt16LE(col, 2);
          cell.copy(value, 4, 4 + (col - start) * 6, 10 + (col - start) * 6);
          replacements.push(
            col >= 2
              ? record(0x201, value.subarray(0, 6))
              : record(0x27e, value),
          );
        }
        bytes = Buffer.concat(replacements);
      }
    }
    output.push(bytes);
    position += bytes.length;
  }
  for (const bytes of output)
    if (bytes.readUInt16LE(0) === 0x85) {
      const offset = offsetMap.get(bytes.readUInt32LE(4));
      if (offset === undefined) throw new Error('Invalid worksheet offset');
      bytes.writeUInt32LE(offset, 4);
    }
  CFB.utils.cfb_add(cfb, 'Workbook', Buffer.concat(output));
  return new Uint8Array(CFB.write(cfb, { type: 'buffer' }));
}
