import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Transaction {
  id: string;
  from_address: string;
  to_address: string;
  amount: number;
  status: 'completed' | 'pending';
  tx_hash: string;
  created_at: string;
}

export type FilterType = 'all' | 'sent' | 'received';

export function useTransactions(walletAddress: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchTransactions = useCallback(async () => {
    if (!walletAddress) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter === 'sent') {
        query = query.eq('from_address', walletAddress);
      } else if (filter === 'received') {
        query = query.eq('to_address', walletAddress);
      } else {
        query = query.or(
          `from_address.eq.${walletAddress},to_address.eq.${walletAddress}`
        );
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setTransactions(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Real-time subscription for new transactions
  useEffect(() => {
    if (!walletAddress) return;

    const channel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const newTx = payload.new as Transaction;
          if (
            newTx.from_address === walletAddress ||
            newTx.to_address === walletAddress
          ) {
            setTransactions((prev) => [newTx, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [walletAddress]);

  return { transactions, loading, error, filter, setFilter, refetch: fetchTransactions };
}
