import { z } from 'zod';
export const importSummarySchema = z.object({
  id: z.string(),
  fileName: z.string(),
  importedAt: z.string().datetime(),
  totalRows: z.number().int(),
  created: z.number().int(),
  updated: z.number().int(),
  unchanged: z.number().int(),
});
export type ImportSummaryDto = z.infer<typeof importSummarySchema>;
export const importsSchema = z.array(importSummarySchema);
export const importRequestSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[^/\\\x00-\x1f]+\.xlsx$/i, 'Потрібен файл .xlsx'),
});
