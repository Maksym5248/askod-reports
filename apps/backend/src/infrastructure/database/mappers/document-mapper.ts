import type { Document as PrismaDocument } from '@prisma/client';
import type { JournalDocument } from '../../../domain';
export function toPersistence(document: JournalDocument) {
  return {
    ...document,
    registrationYear: Number(document.registeredAt.slice(0, 4)),
    registeredAt: new Date(`${document.registeredAt}T00:00:00.000Z`),
    controlRemovedAt: document.controlRemovedAt
      ? new Date(`${document.controlRemovedAt}T00:00:00.000Z`)
      : null,
    controlDeadline: document.controlDeadline
      ? new Date(`${document.controlDeadline}T00:00:00.000Z`)
      : null,
    correspondentDate: document.correspondentDate
      ? new Date(`${document.correspondentDate}T00:00:00.000Z`)
      : null,
    correspondentDeadline: document.correspondentDeadline
      ? new Date(`${document.correspondentDeadline}T00:00:00.000Z`)
      : null,
  };
}
export function toDomain(
  row: PrismaDocument,
): JournalDocument & { id: string } {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    registeredAt: row.registeredAt.toISOString().slice(0, 10),
    title: row.title,
    pageCount: row.pageCount,
    attachments: row.attachments,
    attachmentPageCount: row.attachmentPageCount,
    controlRemovedAt: row.controlRemovedAt?.toISOString().slice(0, 10) ?? null,
    controlDeadline: row.controlDeadline?.toISOString().slice(0, 10) ?? null,
    extendedDeadline: row.extendedDeadline,
    note: row.note,
    volume: row.volume,
    applicant: row.applicant,
    applicantCount: row.applicantCount,
    applicantAddress: row.applicantAddress,
    branch: row.branch,
    documentType: row.documentType,
    nomenclature: row.nomenclature,
    control: row.control,
    chiefExecutor: row.chiefExecutor,
    controller: row.controller,
    route: row.route,
    status: row.status,
    cardAuthor: row.cardAuthor,
    multiplicity: row.multiplicity,
    applicantType: row.applicantType,
    subjectType: row.subjectType,
    reviewer: row.reviewer,
    reviewResult: row.reviewResult,
    reviewResultText: row.reviewResultText,
    territoryCode: row.territoryCode,
    territory: row.territory,
    receivedVia: row.receivedVia,
    executorDepartment: row.executorDepartment,
    registrationDepartment: row.registrationDepartment,
    folder: row.folder ?? '',
    organization: row.organization ?? '',
    mobilePhone: row.mobilePhone,
    email: row.email,
    correspondent: row.correspondent,
    correspondentNumber: row.correspondentNumber,
    correspondentDate:
      row.correspondentDate?.toISOString().slice(0, 10) ?? null,
    correspondentDeadline:
      row.correspondentDeadline?.toISOString().slice(0, 10) ?? null,
  };
}
