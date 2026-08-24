-- CreateEnum
CREATE TYPE "DiceDirection" AS ENUM ('OVER', 'UNDER');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'CASHED_OUT', 'LOST');

-- CreateTable
CREATE TABLE "StaffPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityFeed" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiceBet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "direction" "DiceDirection" NOT NULL,
    "roll" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "payout" INTEGER NOT NULL,
    "won" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiceBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WheelSpin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "segmentIndex" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "payout" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WheelSpin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinesGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mineCount" INTEGER NOT NULL,
    "minePositions" INTEGER[],
    "revealed" INTEGER[],
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "MinesGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrashGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "crashPoint" DOUBLE PRECISION NOT NULL,
    "cashOutMultiplier" DOUBLE PRECISION,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "payout" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CrashGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffPermission_userId_key_key" ON "StaffPermission"("userId", "key");

-- CreateIndex
CREATE INDEX "ActivityFeed_createdAt_idx" ON "ActivityFeed"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityFeed_type_idx" ON "ActivityFeed"("type");

-- CreateIndex
CREATE INDEX "DiceBet_userId_createdAt_idx" ON "DiceBet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WheelSpin_userId_createdAt_idx" ON "WheelSpin"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MinesGame_userId_status_idx" ON "MinesGame"("userId", "status");

-- CreateIndex
CREATE INDEX "CrashGame_userId_status_idx" ON "CrashGame"("userId", "status");

-- AddForeignKey
ALTER TABLE "StaffPermission" ADD CONSTRAINT "StaffPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPermission" ADD CONSTRAINT "StaffPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiceBet" ADD CONSTRAINT "DiceBet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WheelSpin" ADD CONSTRAINT "WheelSpin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinesGame" ADD CONSTRAINT "MinesGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrashGame" ADD CONSTRAINT "CrashGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
