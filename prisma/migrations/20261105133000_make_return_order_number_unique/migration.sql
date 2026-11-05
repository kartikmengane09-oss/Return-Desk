-- This migration will fail without making data changes if duplicate order
-- numbers exist. Resolve those records deliberately before applying it.
CREATE UNIQUE INDEX "ReturnRequest_orderNumber_key" ON "ReturnRequest"("orderNumber");

DROP INDEX "ReturnRequest_orderNumber_idx";
