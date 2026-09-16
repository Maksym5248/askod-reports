-- CreateTable
CREATE TABLE "DocumentChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    CONSTRAINT "DocumentChange_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "registrationNumber" TEXT NOT NULL,
    "registrationYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT,
    "pageCount" INTEGER,
    "attachments" TEXT,
    "attachmentPageCount" INTEGER,
    "controlRemovedAt" DATETIME,
    "controlDeadline" DATETIME,
    "extendedDeadline" TEXT,
    "note" TEXT,
    "volume" TEXT,
    "applicant" TEXT,
    "applicantCount" INTEGER,
    "applicantAddress" TEXT,
    "branch" TEXT,
    "documentType" TEXT,
    "nomenclature" TEXT,
    "control" TEXT,
    "chiefExecutor" TEXT,
    "controller" TEXT,
    "route" TEXT,
    "status" TEXT,
    "cardAuthor" TEXT,
    "multiplicity" TEXT,
    "applicantType" TEXT,
    "subjectType" TEXT,
    "reviewer" TEXT,
    "reviewResult" TEXT,
    "reviewResultText" TEXT,
    "territoryCode" TEXT,
    "territory" TEXT,
    "receivedVia" TEXT,
    "executorDepartment" TEXT,
    "registrationDepartment" TEXT,
    "folder" TEXT,
    "organization" TEXT,
    "mobilePhone" TEXT,
    "email" TEXT,
    "correspondent" TEXT,
    "correspondentNumber" TEXT,
    "correspondentDate" DATETIME,
    "correspondentDeadline" DATETIME
);
INSERT INTO "new_Document" ("applicant", "applicantAddress", "applicantCount", "applicantType", "attachmentPageCount", "attachments", "branch", "cardAuthor", "chiefExecutor", "contentHash", "control", "controlDeadline", "controlRemovedAt", "controller", "correspondent", "correspondentDate", "correspondentDeadline", "correspondentNumber", "documentType", "email", "executorDepartment", "extendedDeadline", "folder", "id", "mobilePhone", "multiplicity", "nomenclature", "note", "organization", "pageCount", "receivedVia", "registeredAt", "registrationDepartment", "registrationNumber", "registrationYear", "reviewResult", "reviewResultText", "reviewer", "route", "status", "subjectType", "territory", "territoryCode", "title", "volume") SELECT "applicant", "applicantAddress", "applicantCount", "applicantType", "attachmentPageCount", "attachments", "branch", "cardAuthor", "chiefExecutor", "contentHash", "control", "controlDeadline", "controlRemovedAt", "controller", "correspondent", "correspondentDate", "correspondentDeadline", "correspondentNumber", "documentType", "email", "executorDepartment", "extendedDeadline", "folder", "id", "mobilePhone", "multiplicity", "nomenclature", "note", "organization", "pageCount", "receivedVia", "registeredAt", "registrationDepartment", "registrationNumber", "registrationYear", "reviewResult", "reviewResultText", "reviewer", "route", "status", "subjectType", "territory", "territoryCode", "title", "volume" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
CREATE INDEX "Document_registeredAt_idx" ON "Document"("registeredAt");
CREATE INDEX "Document_registrationNumber_idx" ON "Document"("registrationNumber");
CREATE UNIQUE INDEX "Document_registrationNumber_registrationYear_key" ON "Document"("registrationNumber", "registrationYear");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DocumentChange_documentId_changedAt_idx" ON "DocumentChange"("documentId", "changedAt");


-- Recover meaningful dates from successful imports; unchanged imports do not update updatedAt.
UPDATE "Document" SET
 "createdAt" = COALESCE((SELECT MIN(i."importedAt") FROM "ImportRow" r JOIN "Import" i ON i.id = r."importId" WHERE r."documentId" = "Document".id), "createdAt"),
 "updatedAt" = COALESCE((SELECT MAX(i."importedAt") FROM "ImportRow" r JOIN "Import" i ON i.id = r."importId" WHERE r."documentId" = "Document".id AND r.outcome IN ('created', 'updated')), "updatedAt");
