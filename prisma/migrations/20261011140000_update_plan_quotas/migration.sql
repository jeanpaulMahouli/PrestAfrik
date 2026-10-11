ALTER TABLE "Plan"
ALTER COLUMN "productQuota" DROP NOT NULL;

UPDATE "Plan"
SET
    "productQuota" = CASE "code"
        WHEN 'ESSENTIAL' THEN 25
        WHEN 'BUSINESS' THEN 100
        WHEN 'PRO' THEN NULL
        ELSE "productQuota"
    END,
    "memberQuota" = CASE "code"
        WHEN 'ESSENTIAL' THEN 2
        WHEN 'BUSINESS' THEN 10
        WHEN 'PRO' THEN 30
        ELSE "memberQuota"
    END,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('ESSENTIAL', 'BUSINESS', 'PRO');
