import { z } from 'zod';
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(value);
    return (
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  });
export const reportInputSchema = z
  .object({
    id: z.enum([
      'appendix-1',
      'appendix-2',
      'appendix-3',
      'appendix-4',
      'journal',
      'public-information',
    ]),
    from: date,
    to: date,
    organization: z.string().trim().min(1).max(300),
  })
  .refine((value) => value.from <= value.to);
export const reportCatalogSchema = z.array(
  z.object({
    id: reportInputSchema.innerType().shape.id,
    name: z.string(),
    description: z.string(),
  }),
);
export const reportDownloadSchema = z.object({
  fileName: z.string(),
  base64: z.string(),
});
