-- Anciennes adresses des boutiques renommées : redirection vers l'adresse actuelle.

CREATE TABLE "StoreSlugAlias" (
    "slug" VARCHAR(40) NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreSlugAlias_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "StoreSlugAlias_storeId_idx" ON "StoreSlugAlias"("storeId");

ALTER TABLE "StoreSlugAlias" ADD CONSTRAINT "StoreSlugAlias_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
