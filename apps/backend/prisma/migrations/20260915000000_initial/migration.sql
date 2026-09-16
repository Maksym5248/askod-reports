CREATE TABLE "Document" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "registrationNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "registeredAt" DATETIME NOT NULL
);
CREATE INDEX "Document_registeredAt_idx" ON "Document"("registeredAt");
CREATE INDEX "Document_registrationNumber_idx" ON "Document"("registrationNumber");
