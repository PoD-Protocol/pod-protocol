'use client';

import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useEffect, useMemo } from 'react';
import { PodComClient } from '@pod-protocol/sdk';

export default function usePodClient() {
  const wallet = useAnchorWallet();

  const client = useMemo(() => new PodComClient(), []);

  useEffect(() => {
    const init = async () => {
      try {
        if (wallet) {
          await client.initialize(wallet as any);
        } else {
          await client.initialize();
        }
      } catch (err) {
        console.error('Failed to initialize PoD client', err);
      }
    };

    init();
  }, [client, wallet]);

  return client;
}
