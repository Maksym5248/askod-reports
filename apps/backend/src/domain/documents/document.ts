import type { DocumentEnumValue } from './document-enums';
export interface JournalDocument {
  readonly registrationNumber: string;
  readonly registeredAt: string;
  readonly title: string;
  readonly pageCount: number | null;
  readonly attachments: string | null;
  readonly attachmentPageCount: number | null;
  readonly controlRemovedAt: string | null;
  readonly controlDeadline: string | null;
  readonly extendedDeadline: string | null;
  readonly note: string | null;
  readonly volume: string | null;
  readonly applicant: string | null;
  readonly applicantCount: number | null;
  readonly applicantAddress: string | null;
  readonly branch: string | null;
  readonly documentType: DocumentEnumValue<'documentType'> | null;
  readonly nomenclature: string | null;
  readonly control: string | null;
  readonly chiefExecutor: string | null;
  readonly controller: string | null;
  readonly route: DocumentEnumValue<'route'> | null;
  readonly status: DocumentEnumValue<'status'> | null;
  readonly cardAuthor: string | null;
  readonly multiplicity: DocumentEnumValue<'multiplicity'> | null;
  readonly applicantType: DocumentEnumValue<'applicantType'> | null;
  readonly subjectType: DocumentEnumValue<'subjectType'> | null;
  readonly reviewer: string | null;
  readonly reviewResult: string | null;
  readonly reviewResultText: string | null;
  readonly territoryCode: string | null;
  readonly territory: string | null;
  readonly receivedVia: DocumentEnumValue<'receivedVia'> | null;
  readonly executorDepartment: string | null;
  readonly registrationDepartment: string | null;
  readonly folder: DocumentEnumValue<'folder'>;
  readonly organization: string;
  readonly mobilePhone: string | null;
  readonly email: string | null;
  readonly correspondent: string | null;
  readonly correspondentNumber: string | null;
  readonly correspondentDate: string | null;
  readonly correspondentDeadline: string | null;
}

export interface Document extends JournalDocument {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly version: number;
}
