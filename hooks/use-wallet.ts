import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@fastshot/auth';

export interface Wallet {
  id: string;
  user_id: string;
  address: string;
  balance: number;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      setWallet(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Real-time subscription for balance updates
  useEffect(() => {
    if (!wallet) return;

    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `id=eq.${wallet.id}`,
        },
        (payload) => {
          setWallet((prev) =>
            prev ? { ...prev, ...payload.new } as Wallet : null
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [wallet?.id]);

  return { wallet, loading, error, refetch: fetchWallet };
}
