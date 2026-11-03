-- Comptes sans numéro WhatsApp : le numéro de leur propre boutique (rôle OWNER, jamais une boutique où ils
-- ont été invités) devient celui du compte. Boutique la plus ancienne d'abord ; numéro de la boutique, sinon
-- celui de l'API WhatsApp. Un numéro déjà pris par un compte, ou réclamé par plusieurs comptes, est ignoré :
-- la personne le saisira elle-même (même règle dans modules/auth/google.ts).
WITH owned AS (
  SELECT m."userId", COALESCE(NULLIF(s."phoneE164", ''), ws."businessNumber") AS phone, m."createdAt"
  FROM "StoreMembership" m
  JOIN "Store" s ON s."id" = m."storeId"
  JOIN "User" u ON u."id" = m."userId"
  LEFT JOIN "WhatsappSettings" ws ON ws."storeId" = s."id"
  WHERE m."role" = 'OWNER' AND u."phoneNumber" IS NULL
),
candidates AS (
  SELECT DISTINCT ON ("userId") "userId", phone
  FROM owned
  WHERE phone ~ '^\+[0-9]{8,15}$'
  ORDER BY "userId", "createdAt" ASC
),
eligible AS (
  SELECT c."userId", c.phone
  FROM candidates c
  WHERE NOT EXISTS (SELECT 1 FROM "User" x WHERE x."phoneNumber" = c.phone)
    AND (SELECT COUNT(*) FROM candidates c2 WHERE c2.phone = c.phone) = 1
)
UPDATE "User" u
SET "phoneNumber" = e.phone, "updatedAt" = NOW()
FROM eligible e
WHERE u."id" = e."userId";
