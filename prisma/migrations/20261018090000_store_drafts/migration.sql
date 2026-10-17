-- Boutiques en cours de création : la boutique n'est créée qu'à la fin de l'assistant.
CREATE TABLE "StoreDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoreDraft_userId_updatedAt_idx" ON "StoreDraft"("userId", "updatedAt");

ALTER TABLE "StoreDraft" ADD CONSTRAINT "StoreDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
