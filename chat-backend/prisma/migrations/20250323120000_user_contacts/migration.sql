-- CreateTable
CREATE TABLE "UserContact" (
    "ownerId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContact_pkey" PRIMARY KEY ("ownerId","contactId")
);

-- CreateIndex
CREATE INDEX "UserContact_ownerId_idx" ON "UserContact"("ownerId");

-- CreateIndex
CREATE INDEX "UserContact_contactId_idx" ON "UserContact"("contactId");

-- AddForeignKey
ALTER TABLE "UserContact" ADD CONSTRAINT "UserContact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContact" ADD CONSTRAINT "UserContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
