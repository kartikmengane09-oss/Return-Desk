-- Preserve existing soft-deleted records by marking them as archived at the
-- time this migration is applied. No return requests or notes are deleted.
ALTER TABLE "ReturnRequest" ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "ReturnRequest"
SET "deletedAt" = CURRENT_TIMESTAMP
WHERE "isDeleted" = true AND "deletedAt" IS NULL;

CREATE INDEX "ReturnRequest_deletedAt_idx" ON "ReturnRequest"("deletedAt");
