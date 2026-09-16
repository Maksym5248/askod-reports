export type SourceValue = string | number | boolean | null;
export interface SourceRow {
  rowNumber: number;
  values: Record<string, SourceValue>;
  raw: Record<string, SourceValue>;
}
