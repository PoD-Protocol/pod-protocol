'use client';

import { FC, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const RequireWallet: FC<{ children: ReactNode }> = ({ children }) => {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="mb-4 text-gray-300">Connect your wallet to continue</p>
        <WalletMultiButton />
      </div>
    );
  }

  return <>{children}</>;
};
