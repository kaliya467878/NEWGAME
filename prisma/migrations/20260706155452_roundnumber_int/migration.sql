/*
  Warnings:

  - You are about to alter the column `roundNumber` on the `PregeneratedResult` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `roundNumber` on the `ResultOverride` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `roundNumber` on the `WingoBet` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `roundNumber` on the `WingoResult` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "PregeneratedResult" ALTER COLUMN "roundNumber" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "ResultOverride" ALTER COLUMN "roundNumber" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "WingoBet" ALTER COLUMN "roundNumber" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "WingoResult" ALTER COLUMN "roundNumber" SET DATA TYPE INTEGER;
