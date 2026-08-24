-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('WELCOME_BONUS', 'DEPOSIT_APPROVED', 'WITHDRAW_APPROVED', 'WITHDRAW_REJECTED_REFUND', 'BET_PLACED', 'BET_WON', 'BET_LOST', 'ADMIN_ADJUST');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WingoMode" AS ENUM ('S30', 'M1', 'M3', 'M5');

-- CreateEnum
CREATE TYPE "WingoBetType" AS ENUM ('NUMBER', 'COLOR', 'BIG_SMALL');

-- CreateEnum
CREATE TYPE "WingoBetStatus" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('RANDOM', 'SCHEDULED', 'MANUAL');

-- CreateEnum
CREATE TYPE "ResultMode" AS ENUM ('RANDOM', 'SCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "displayName" TEXT NOT NULL,
    "avatarSeed" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referredById" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "LedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepositRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingoBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "WingoMode" NOT NULL,
    "roundNumber" BIGINT NOT NULL,
    "betType" "WingoBetType" NOT NULL,
    "selection" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WingoBetStatus" NOT NULL DEFAULT 'PENDING',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WingoBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WingoResult" (
    "id" TEXT NOT NULL,
    "mode" "WingoMode" NOT NULL,
    "roundNumber" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "source" "ResultSource" NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WingoResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultOverride" (
    "id" TEXT NOT NULL,
    "mode" "WingoMode" NOT NULL,
    "roundNumber" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PregeneratedResult" (
    "id" TEXT NOT NULL,
    "mode" "WingoMode" NOT NULL,
    "roundNumber" BIGINT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PregeneratedResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PasswordResetRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "ip" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "DepositRequest_status_createdAt_idx" ON "DepositRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WithdrawRequest_status_createdAt_idx" ON "WithdrawRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WingoBet_mode_roundNumber_idx" ON "WingoBet"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "WingoBet_userId_createdAt_idx" ON "WingoBet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WingoResult_mode_roundNumber_key" ON "WingoResult"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "ResultOverride_mode_roundNumber_idx" ON "ResultOverride"("mode", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PregeneratedResult_mode_roundNumber_key" ON "PregeneratedResult"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "PasswordResetRequest_userId_requestedAt_idx" ON "PasswordResetRequest"("userId", "requestedAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WingoBet" ADD CONSTRAINT "WingoBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultOverride" ADD CONSTRAINT "ResultOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PregeneratedResult" ADD CONSTRAINT "PregeneratedResult_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetRequest" ADD CONSTRAINT "PasswordResetRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
