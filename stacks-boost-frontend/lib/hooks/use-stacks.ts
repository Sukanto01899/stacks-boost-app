"use client";

import type { UserData } from "@stacks/auth";
import { AppConfig, UserSession } from "@stacks/auth";
import {
  DEFAULT_PROVIDERS,
  clearSelectedProviderId,
  disconnect as disconnectStacks,
  getStacksProvider,
  getSelectedProviderId,
  showConnect,
} from "@stacks/connect";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  STACKS_APP_DETAILS,
  STACKS_MANIFEST_PATH,
  STACKS_REDIRECT_PATH,
} from "@/lib/stacks-config";

export type WalletStatus =
  | "idle"
  | "pending"
  | "connected"
  | "disconnected"
  | "error";

export type WalletAddresses = {
  mainnet?: string;
  testnet?: string;
  btc?: string;
};

export type WalletProfile = {
  username?: string | null;
  avatarUrl?: string | null;
  raw?: unknown;
};

export type WalletState = {
  status: WalletStatus;
  addresses: WalletAddresses;
  profile?: WalletProfile;
  error?: string | null;
  providerName?: string | null;
  isLoading: boolean;
};

export type ConnectWallet = () => Promise<void>;
export type DisconnectWallet = () => Promise<void>;
export type RefreshWallet = () => Promise<void>;

export type UseStacksResult = WalletState & {
  connect: ConnectWallet;
  disconnect: DisconnectWallet;
  refresh: RefreshWallet;
  isConnected: boolean;
  isPending: boolean;
  isReady: boolean;
  stxAddress?: string;
  btcAddress?: string;
};

const initialState: WalletState = {
  status: "idle",
  addresses: {},
  profile: undefined,
  error: null,
  providerName: null,
  isLoading: true,
};

export function useStacks(): UseStacksResult {
  const [state, setState] = useState<WalletState>(initialState);
  const hasHydrated = useRef(false);
  const userSessionRef = useRef<UserSession | null>(null);

  const isBrowser = typeof window !== "undefined";

  const getUserSession = useCallback(() => {
    if (!isBrowser) return null;
    if (userSessionRef.current) return userSessionRef.current;

    const appConfig = new AppConfig(["store_write"]);
    userSessionRef.current = new UserSession({ appConfig });
    return userSessionRef.current;
  }, [isBrowser]);

  const parseAddresses = useCallback((userData?: UserData | null) => {
    if (!userData) return {};
    const profile = userData.profile as Record<string, any>;
    const stxAddress =
      profile?.stxAddress ??
      profile?.stx_address ??
      profile?.addresses?.stx ??
      {};

    return {
      mainnet: stxAddress.mainnet || stxAddress.mainnetAddress,
      testnet: stxAddress.testnet || stxAddress.testnetAddress,
      btc: profile?.btcAddress || profile?.btc || profile?.btc_address,
    } satisfies WalletAddresses;
  }, []);

  const parseProfile = useCallback((userData?: UserData | null) => {
    if (!userData) return undefined;
    const profile = userData.profile as Record<string, any>;
    return {
      username: (userData as any).username ?? profile?.username ?? null,
      avatarUrl: profile?.image?.[0]?.contentUrl ?? null,
      raw: profile,
    } satisfies WalletProfile;
  }, []);

  const setConnectedState = useCallback(
    (userData: UserData | null, providerName?: string | null) => {
      setState((prev) => ({
        status: userData ? "connected" : "disconnected",
        addresses: parseAddresses(userData),
        profile: parseProfile(userData),
        providerName: providerName ?? prev.providerName ?? null,
        error: null,
        isLoading: false,
      }));
    },
    [parseAddresses, parseProfile],
  );

  const resolveProviderName = useCallback(() => {
    const provider = getStacksProvider() as { name?: string } | undefined;
    if (provider?.name) return provider.name;

    const selectedProviderId = getSelectedProviderId?.();
    const matched = DEFAULT_PROVIDERS.find((item) => item.id === selectedProviderId);
    return matched?.name ?? null;
  }, []);

  useEffect(() => {
    hasHydrated.current = true;
    if (!isBrowser) {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isBrowser]);

  const bootstrapSession = useCallback(async () => {
    const session = getUserSession();
    if (!session) {
      setState((prev) => ({
        ...prev,
        status: "disconnected",
        isLoading: false,
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      if (session.isSignInPending()) {
        setState((prev) => ({ ...prev, status: "pending" }));
        const userData = await session.handlePendingSignIn();
        setConnectedState(userData, resolveProviderName());
        return;
      }

      if (session.isUserSignedIn()) {
        const userData = await session.loadUserData();
        setConnectedState(userData, resolveProviderName());
        return;
      }

      setState((prev) => ({
        ...prev,
        status: "disconnected",
        isLoading: false,
        addresses: {},
        profile: undefined,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        isLoading: false,
      }));
    }
  }, [getUserSession, resolveProviderName, setConnectedState]);

  useEffect(() => {
    if (!isBrowser) return;
    void bootstrapSession();
  }, [bootstrapSession, isBrowser]);

  const connect = useMemo<ConnectWallet>(
    () => async () => {
      const session = getUserSession();
      if (!session) return;
      if (session.isUserSignedIn()) {
        const userData = await session.loadUserData();
        setConnectedState(userData);
        return;
      }

      setState((prev) => ({ ...prev, status: "pending", isLoading: true }));

      try {
        clearSelectedProviderId();
        await new Promise<void>((resolve, reject) => {
          showConnect(
            {
              appDetails: STACKS_APP_DETAILS,
              redirectTo: STACKS_REDIRECT_PATH,
              manifestPath: STACKS_MANIFEST_PATH,
              sendToSignIn: true,
              userSession: session,
              defaultProviders: DEFAULT_PROVIDERS,
              onFinish: async () => {
                const userData = await session.loadUserData();
                const providerName = resolveProviderName();
                setConnectedState(userData, providerName);
                resolve();
              },
              onCancel: () => {
                setState((prev) => ({
                  ...prev,
                  status: "disconnected",
                  isLoading: false,
                  error: "Wallet connection was cancelled",
                }));
                reject(new Error("Wallet connection cancelled"));
              },
            },
            undefined,
          );
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to connect wallet";
        if (message === "Wallet connection cancelled") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: message,
          isLoading: false,
        }));
      }
    },
    [getUserSession, resolveProviderName, setConnectedState],
  );

  const disconnect = useMemo<DisconnectWallet>(
    () => async () => {
      const session = getUserSession();
      disconnectStacks();
      session?.signUserOut();

      setState({
        ...initialState,
        status: "disconnected",
        isLoading: false,
      });
    },
    [getUserSession],
  );

  const refresh = useMemo<RefreshWallet>(
    () => async () => {
      if (!hasHydrated.current) return;
      await bootstrapSession();
    },
    [bootstrapSession],
  );

  return {
    ...state,
    connect,
    disconnect,
    refresh,
    isConnected: state.status === "connected",
    isPending: state.status === "pending",
    isReady: isBrowser && hasHydrated.current,
    stxAddress: state.addresses.testnet ?? state.addresses.mainnet,
    btcAddress: state.addresses.btc,
  };
}
