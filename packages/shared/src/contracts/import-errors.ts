import { z } from 'zod';
export const importErrorResponseSchema = z.object({
  error: z.string(),
  issues: z.array(
    z.object({
      row: z.number().int(),
      field: z.string(),
      message: z.string(),
      value: z.string().optional(),
      allowedValues: z.array(z.string()).optional(),
    }),
  ),
  issueCount: z.number().int().optional(),
  report: z
    .object({ fileName: z.literal('import-errors.xlsx'), base64: z.string() })
    .optional(),
});
export type ImportErrorResponse = z.infer<typeof importErrorResponseSchema>;
