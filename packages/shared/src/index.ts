import { z } from 'zod';
export const workspaceStatusSchema = z.object({
  documentCount: z.number().int().nonnegative(),
});
export type WorkspaceStatusDto = z.infer<typeof workspaceStatusSchema>;
