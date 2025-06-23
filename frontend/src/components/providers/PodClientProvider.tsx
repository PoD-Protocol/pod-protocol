'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { PodComClient } from '@pod-protocol/sdk';

const PodClientContext = createContext<PodComClient | null>(null);

export const PodClientProvider = ({ children }: { children: ReactNode }) => {
  const wallet = useWallet();
  const [client, setClient] = useState<PodComClient | null>(null);

  useEffect(() => {
    const init = async () => {
      const c = new PodComClient();
      if (wallet.connected && wallet.publicKey && wallet.signTransaction) {
        const anchorWallet: AnchorWallet = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions!,
        };
        await c.initialize(anchorWallet);
      } else {
        await c.initialize();
      }
      setClient(c);
    };
    init();
  }, [wallet.connected, wallet.publicKey]);

  return <PodClientContext.Provider value={client}>{children}</PodClientContext.Provider>;
};

export const usePodClient = () => useContext(PodClientContext);
