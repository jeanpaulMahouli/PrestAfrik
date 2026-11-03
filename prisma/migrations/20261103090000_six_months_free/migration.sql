-- Offre de lancement : 6 mois d'abonnement offerts à toutes les boutiques déjà inscrites
-- (les nouvelles les reçoivent à la création, modules/stores/wizard-actions.ts).
-- La période gratuite est comptée depuis le début de l'essai ; un essai déjà plus long est conservé.
-- Les abonnements payés (période en cours) ne sont pas modifiés.
UPDATE "Subscription"
SET "status" = 'TRIAL',
    "trialEndsAt" = GREATEST("trialEndsAt", "trialStartedAt" + INTERVAL '6 months'),
    "updatedAt" = NOW()
WHERE "currentPeriodEnd" IS NULL
  AND "status" IN ('TRIAL', 'EXPIRED');
