"use client";

import { create } from "zustand";

/**
 * Client-side balance mirror. Initialised from the server render and updated
 * from every server-action result. The client NEVER computes balances — it
 * only displays the value the server returns.
 */
interface BalanceState {
  balance: number;
  setBalance: (balance: number) => void;
}

export const useBalanceStore = create<BalanceState>((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
}));
