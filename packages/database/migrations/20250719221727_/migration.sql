/*
  Warnings:

  - You are about to drop the column `description` on the `UniqueLinePattern` table. All the data in the column will be lost.
  - You are about to drop the column `exampleValues` on the `UniqueLinePattern` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UniqueLinePattern" DROP COLUMN "description",
DROP COLUMN "exampleValues";
