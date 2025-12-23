"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalConnector } from "@reown/appkit-universal-connector";

import { getUniversalConnector } from "@/lib/walletconnect";

type StxAddressEntry = {
  symbol?: string;
  address?: string;
};

type WalletConnectStatus = "idle" | "pending" | "connected" | "disconnected" | "error";

type WalletConnectState = {
  status: WalletConnectStatus;
  isReady: boolean;
  isLoading: boolean;
  error?: string | null;
  session?: unknown;
  addresses: StxAddressEntry[];
};

type WalletConnectRequest = <T = unknown>(args: {
  method: string;
  params?: Record<string, unknown> | unknown;
}) => Promise<T>;

const initialState: WalletConnectState = {
  status: "idle",
  isReady: false,
  isLoading: true,
  error: null,
  session: undefined,
  addresses: [],
};

type StoreListener = (state: WalletConnectState) => void;

const store = {
  state: initialState,
  listeners: new Set<StoreListener>(),
};

let connectorInstance: UniversalConnector | null = null;
let connectorPromise: Promise<UniversalConnector> | null = null;

function setStoreState(updater: (prev: WalletConnectState) => WalletConnectState) {
  store.state = updater(store.state);
  store.listeners.forEach((listener) => listener(store.state));
}

async function getConnector() {
  if (connectorInstance) return connectorInstance;
  if (!connectorPromise) {
    connectorPromise = getUniversalConnector().then((instance) => {
      connectorInstance = instance;
      return instance;
    });
  }
  return connectorPromise;
}

function pickStxAddress(addresses: StxAddressEntry[]) {
  return (
    addresses.find((entry) => entry.symbol === "STX")?.address ??
    addresses.find((entry) => entry.address?.startsWith("SP"))?.address ??
    addresses.find((entry) => entry.address?.startsWith("ST"))?.address ??
    undefined
  );
}

export function useWalletConnect() {
  const [state, setState] = useState<WalletConnectState>(store.state);

  useEffect(() => {
    let isMounted = true;

    store.listeners.add(setState);

    getConnector()
      .then((instance) => {
        if (!isMounted) return;
        setStoreState((prev) => ({
          ...prev,
          status: "disconnected",
          isReady: true,
          isLoading: false,
        }));
      })
      .catch((error) => {
        if (!isMounted) return;
        setStoreState((prev) => ({
          ...prev,
          status: "error",
          isReady: false,
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to init WalletConnect.",
        }));
      });

    return () => {
      isMounted = false;
      store.listeners.delete(setState);
    };
  }, []);

  const request = useCallback<WalletConnectRequest>(
    async (args) => {
      if (!connectorInstance?.provider) {
        throw new Error("WalletConnect provider not ready.");
      }
      const provider = connectorInstance.provider as {
        request: WalletConnectRequest;
      };
      return provider.request(args);
    },
    [],
  );

  const refreshAddresses = useCallback(async () => {
    if (!connectorInstance) return [];
    const response = (await request({
      method: "stx_getAddresses",
      params: {},
    })) as { addresses?: StxAddressEntry[] };
    const addresses = response?.addresses ?? [];
    setStoreState((prev) => ({ ...prev, addresses }));
    return addresses;
  }, [request]);

  const connect = useCallback(async () => {
    const connector = await getConnector().catch((error) => {
      setStoreState((prev) => ({
        ...prev,
        status: "error",
        isLoading: false,
        error: error instanceof Error ? error.message : "WalletConnect is not ready yet.",
      }));
      return;
    });
    if (!connector) return;

    setStoreState((prev) => ({ ...prev, status: "pending", isLoading: true, error: null }));

    try {
      const { session } = await connector.connect();
      const addresses = await refreshAddresses();
      setStoreState((prev) => ({
        ...prev,
        status: "connected",
        isLoading: false,
        session,
        addresses,
      }));
    } catch (error) {
      setStoreState((prev) => ({
        ...prev,
        status: "error",
        isLoading: false,
        error: error instanceof Error ? error.message : "WalletConnect connection failed.",
      }));
    }
  }, [refreshAddresses]);

  const disconnect = useCallback(async () => {
    if (!connectorInstance) return;
    await connectorInstance.disconnect();
    setStoreState((prev) => ({
      ...prev,
      status: "disconnected",
      isLoading: false,
      session: null,
      addresses: [],
    }));
  }, []);

  const stxAddress = useMemo(() => pickStxAddress(state.addresses), [state.addresses]);

  return {
    ...state,
    connect,
    disconnect,
    request,
    stxAddress,
    isConnected: state.status === "connected",
    isPending: state.status === "pending",
  };
}
