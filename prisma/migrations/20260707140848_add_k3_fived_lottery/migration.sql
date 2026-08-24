-- CreateEnum
CREATE TYPE "K3Mode" AS ENUM ('S30', 'M1', 'M3', 'M5');

-- CreateEnum
CREATE TYPE "K3BetType" AS ENUM ('SUM_VALUE', 'SUM_BIG_SMALL', 'SUM_ODD_EVEN', 'ANY_TRIPLE');

-- CreateEnum
CREATE TYPE "K3BetStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "FiveDMode" AS ENUM ('S30', 'M1', 'M3', 'M5');

-- CreateEnum
CREATE TYPE "FiveDBetType" AS ENUM ('POSITION_NUMBER', 'SUM_BIG_SMALL', 'SUM_ODD_EVEN');

-- CreateEnum
CREATE TYPE "FiveDBetStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "K3Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "K3Mode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "betType" "K3BetType" NOT NULL,
    "selection" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "K3BetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "K3Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "K3Result" (
    "id" TEXT NOT NULL,
    "mode" "K3Mode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "dice1" INTEGER NOT NULL,
    "dice2" INTEGER NOT NULL,
    "dice3" INTEGER NOT NULL,
    "sum" INTEGER NOT NULL,
    "source" "ResultSource" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "K3Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiveDBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "FiveDMode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "betType" "FiveDBetType" NOT NULL,
    "selection" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "FiveDBetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiveDBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiveDResult" (
    "id" TEXT NOT NULL,
    "mode" "FiveDMode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "a" INTEGER NOT NULL,
    "b" INTEGER NOT NULL,
    "c" INTEGER NOT NULL,
    "d" INTEGER NOT NULL,
    "e" INTEGER NOT NULL,
    "sum" INTEGER NOT NULL,
    "source" "ResultSource" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiveDResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "K3Bet_mode_roundNumber_idx" ON "K3Bet"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "K3Bet_userId_createdAt_idx" ON "K3Bet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "K3Result_mode_roundNumber_key" ON "K3Result"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "FiveDBet_mode_roundNumber_idx" ON "FiveDBet"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "FiveDBet_userId_createdAt_idx" ON "FiveDBet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FiveDResult_mode_roundNumber_key" ON "FiveDResult"("mode", "roundNumber");

-- AddForeignKey
ALTER TABLE "K3Bet" ADD CONSTRAINT "K3Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveDBet" ADD CONSTRAINT "FiveDBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
