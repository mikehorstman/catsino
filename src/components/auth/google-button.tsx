"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { authErrorMessage, establishSession } from "@/lib/auth-client";

export function GoogleButton({
  onDone,
  onError,
}: {
  onDone: (created: boolean) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const cred = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
      const { created } = await establishSession(cred.user);
      onDone(created);
    } catch (e) {
      onError(authErrorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="lg" className="w-full" onClick={go} disabled={busy}>
      {busy ? "Connecting…" : "Continue with Google"}
    </Button>
  );
}
