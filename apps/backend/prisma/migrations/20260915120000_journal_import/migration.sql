PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "registrationNumber" TEXT NOT NULL,
  "registrationYear" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "registeredAt" DATETIME NOT NULL,
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
INSERT INTO "new_Document" ("id", "registrationNumber", "title", "registeredAt", "registrationYear")
SELECT "id", "registrationNumber", "title", "registeredAt",
CAST(CASE WHEN typeof("registeredAt") IN ('integer', 'real')
  THEN strftime('%Y', "registeredAt" / 1000, 'unixepoch')
  ELSE strftime('%Y', "registeredAt") END AS INTEGER)
FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE UNIQUE INDEX "Document_registrationNumber_registrationYear_key" ON "Document"("registrationNumber", "registrationYear");
CREATE INDEX "Document_registeredAt_idx" ON "Document"("registeredAt");
CREATE INDEX "Document_registrationNumber_idx" ON "Document"("registrationNumber");
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
CREATE TABLE "Import" (
 "id" TEXT NOT NULL PRIMARY KEY, "fileName" TEXT NOT NULL, "fileHash" TEXT NOT NULL,
 "sheetName" TEXT NOT NULL, "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "totalRows" INTEGER NOT NULL, "created" INTEGER NOT NULL, "updated" INTEGER NOT NULL, "unchanged" INTEGER NOT NULL
);
CREATE INDEX "Import_importedAt_idx" ON "Import"("importedAt");
CREATE TABLE "ImportRow" (
 "id" TEXT NOT NULL PRIMARY KEY, "importId" TEXT NOT NULL, "documentId" TEXT NOT NULL,
 "rowNumber" INTEGER NOT NULL, "outcome" TEXT NOT NULL, "raw" JSONB NOT NULL, "snapshot" JSONB NOT NULL,
 CONSTRAINT "ImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ImportRow_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ImportRow_importId_rowNumber_key" ON "ImportRow"("importId", "rowNumber");
CREATE INDEX "ImportRow_documentId_idx" ON "ImportRow"("documentId");
