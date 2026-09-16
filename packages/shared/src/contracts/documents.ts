import { z } from 'zod';
export const documentsSchema = z.object({
  total: z.number().int(),
  items: z.array(
    z.object({
      id: z.string(),
      registrationNumber: z.string(),
      registeredAt: z.string(),
      title: z.string(),
      applicant: z.string().nullable(),
      documentType: z.string().nullable(),
      chiefExecutor: z.string().nullable(),
    }),
  ),
});
export type DocumentsDto = z.infer<typeof documentsSchema>;
