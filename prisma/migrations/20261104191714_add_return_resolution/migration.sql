/*
  Warnings:

  - The `resolution` column on the `ReturnRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ReturnResolution" AS ENUM ('REFUND', 'REPLACEMENT', 'STORE_CREDIT');

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "resolution",
ADD COLUMN     "resolution" "ReturnResolution";

-- DropEnum
DROP TYPE "Resolution";
