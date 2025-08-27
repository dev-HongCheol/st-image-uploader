// src/stores/counter-store.ts
import { IBuyCryptoSchema } from "@/app/_api/model";
import { createStore } from "zustand/vanilla";
import { immer } from "zustand/middleware/immer";

export type butCryptoState = IBuyCryptoSchema;

export type buyCryptoActions = {
  updateBuyForm: (form: Partial<IBuyCryptoSchema>) => void;
};

export type buyCryptoStore = butCryptoState & buyCryptoActions;

export const defaultInitState: butCryptoState = {
  spend: {
    currency: "",
    amount: "0",
  },
  receive: {
    currency: "",
    amount: "0",
  },
  payment: {
    method: "card",
    price: 119415,
  },
};

export const createBuyCryptoStore = (
  initState: butCryptoState = defaultInitState,
) => {
  return createStore<buyCryptoStore>()(
    immer((set) => ({
      ...initState,
      updateBuyForm: (patch) =>
        set((state) => {
          // 여기서는 draft를 직접 mutate 해도 됩니다.
          if (patch.spend) Object.assign(state.spend, patch.spend);
          if (patch.receive) Object.assign(state.receive, patch.receive);
          if (patch.payment) Object.assign(state.payment, patch.payment);
        }),
    })),
  );
};
