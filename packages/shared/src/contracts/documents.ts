import { z } from 'zod';
import { paginationSchema } from './pagination';
export const documentSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
  registrationNumber: z.string(),
  registeredAt: z.string(),
  title: z.string(),
  pageCount: z.number().int().nullable(),
  attachments: z.string().nullable(),
  attachmentPageCount: z.number().int().nullable(),
  controlRemovedAt: z.string().nullable(),
  controlDeadline: z.string().nullable(),
  extendedDeadline: z.string().nullable(),
  note: z.string().nullable(),
  volume: z.string().nullable(),
  applicant: z.string().nullable(),
  applicantCount: z.number().int().nullable(),
  applicantAddress: z.string().nullable(),
  branch: z.string().nullable(),
  documentType: z.string().nullable(),
  nomenclature: z.string().nullable(),
  control: z.string().nullable(),
  chiefExecutor: z.string().nullable(),
  controller: z.string().nullable(),
  route: z.string().nullable(),
  status: z.string().nullable(),
  cardAuthor: z.string().nullable(),
  multiplicity: z.string().nullable(),
  applicantType: z.string().nullable(),
  subjectType: z.string().nullable(),
  reviewer: z.string().nullable(),
  reviewResult: z.string().nullable(),
  reviewResultText: z.string().nullable(),
  territoryCode: z.string().nullable(),
  territory: z.string().nullable(),
  receivedVia: z.string().nullable(),
  executorDepartment: z.string().nullable(),
  registrationDepartment: z.string().nullable(),
  folder: z.string(),
  organization: z.string(),
  mobilePhone: z.string().nullable(),
  email: z.string().nullable(),
  correspondent: z.string().nullable(),
  correspondentNumber: z.string().nullable(),
  correspondentDate: z.string().nullable(),
  correspondentDeadline: z.string().nullable(),
});
export const documentsSchema = z.object({
  total: z.number().int(),
  items: z.array(documentSchema),
});
export type DocumentDto = z.infer<typeof documentSchema>;
export type DocumentsDto = z.infer<typeof documentsSchema>;
export const documentListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
  documentType: z.string().max(200).optional(),
  sortBy: z.string().max(80).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});
export const updateDocumentSchema = z
  .object({
    version: z.number().int().positive(),
    field: z.string().max(80),
    value: z.union([z.string().max(32767), z.number().finite(), z.null()]),
  })
  .strict();
export const deleteDocumentsSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string().uuid(),
          version: z.number().int().positive(),
        }),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const documentColumnsSchema = z.array(
  z.object({
    field: z.string(),
    header: z.string(),
    type: z.string(),
    allowedValues: z.array(z.string()).optional(),
  }),
);
export type DocumentColumn = z.infer<typeof documentColumnsSchema>[number];
export const documentHistorySchema = z.array(
  z.object({
    id: z.string(),
    changedAt: z.string(),
    source: z.string(),
    before: z.unknown(),
    after: z.unknown(),
  }),
);
