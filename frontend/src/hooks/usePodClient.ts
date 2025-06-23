'use client';

import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useMemo, useEffect } from 'react';
import { PodComClient } from '@pod-protocol/sdk';

export default function usePodClient() {
  const wallet = useAnchorWallet();

  const client = useMemo(() => new PodComClient(), []);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.initialize(wallet as any).catch((err) => {
      if (mounted) {
        console.error('Failed to initialize PoD client', err);
      }
    });
  
    return () => {
      mounted = false;
    };
  }, [client, wallet]);

  return client;
}
