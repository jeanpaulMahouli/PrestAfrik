"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    // Code à 6 chiffres reçu par e-mail (confirmation de l'adresse à l'inscription).
    emailOTPClient(),
    // Numéro WhatsApp demandé à l'inscription (User.phoneNumber, voir modules/auth/server.ts).
    inferAdditionalFields({ user: { phoneNumber: { type: "string", required: false } } }),
  ],
});
