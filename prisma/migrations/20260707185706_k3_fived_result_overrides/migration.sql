-- CreateTable
CREATE TABLE "K3ResultOverride" (
    "id" TEXT NOT NULL,
    "mode" "K3Mode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "dice1" INTEGER NOT NULL,
    "dice2" INTEGER NOT NULL,
    "dice3" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "K3ResultOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiveDResultOverride" (
    "id" TEXT NOT NULL,
    "mode" "FiveDMode" NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "a" INTEGER NOT NULL,
    "b" INTEGER NOT NULL,
    "c" INTEGER NOT NULL,
    "d" INTEGER NOT NULL,
    "e" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiveDResultOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "K3ResultOverride_mode_roundNumber_idx" ON "K3ResultOverride"("mode", "roundNumber");

-- CreateIndex
CREATE INDEX "FiveDResultOverride_mode_roundNumber_idx" ON "FiveDResultOverride"("mode", "roundNumber");

-- AddForeignKey
ALTER TABLE "K3ResultOverride" ADD CONSTRAINT "K3ResultOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiveDResultOverride" ADD CONSTRAINT "FiveDResultOverride_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
