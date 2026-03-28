-- CreateTable
CREATE TABLE "ContactRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContactRequest_fromId_toId_key" ON "ContactRequest"("fromId", "toId");

-- CreateIndex
CREATE INDEX "ContactRequest_toId_idx" ON "ContactRequest"("toId");

-- CreateIndex
CREATE INDEX "ContactRequest_fromId_idx" ON "ContactRequest"("fromId");

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure mutual UserContact rows (both directions) for existing one-way edges
INSERT INTO "UserContact" ("ownerId", "contactId", "createdAt")
SELECT c."contactId", c."ownerId", CURRENT_TIMESTAMP
FROM "UserContact" c
WHERE NOT EXISTS (
  SELECT 1 FROM "UserContact" r
  WHERE r."ownerId" = c."contactId" AND r."contactId" = c."ownerId"
);
