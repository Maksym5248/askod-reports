import type { JournalDocument } from './document';
// A document number is unique within its registration calendar year.
export function documentIdentity(document: JournalDocument): string {
  return JSON.stringify([
    document.registrationNumber,
    document.registeredAt.slice(0, 4),
  ]);
}
