export type ChainhookEvent = {
  id: string;
  txId: string;
  functionName: string;
  contractId: string;
  blockHeight?: number;
  receivedAt: string;
};

type ChainhookStore = {
  events: ChainhookEvent[];
};

const globalStore = globalThis as typeof globalThis & {
  stacksBoostChainhooks?: ChainhookStore;
};

const store: ChainhookStore = globalStore.stacksBoostChainhooks ?? {
  events: [],
};

globalStore.stacksBoostChainhooks = store;

export function addChainhookEvent(event: ChainhookEvent) {
  store.events.unshift(event);
  if (store.events.length > 50) {
    store.events.length = 50;
  }
}

export function listChainhookEvents(limit = 15) {
  return store.events.slice(0, limit);
}
