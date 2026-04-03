import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface ContactEntry {
  display_name: string;
  phone_number: string;
  source: string;
}

export function useContacts() {
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadContacts = useCallback(async () => {
    // expo-contacts is not supported on web
    if (Platform.OS === 'web') return;

    setLoading(true);
    try {
      const Contacts = await import('expo-contacts');

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return;

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.PhoneNumbers,
        ],
      });

      const formatted: ContactEntry[] = data
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .map((c) => ({
          display_name: c.name ?? '',
          phone_number:
            c.phoneNumbers![0].number?.replace(/\s/g, '') ?? '',
          source: 'phone_contacts',
        }))
        .filter((c) => c.phone_number.length > 0);

      // Sync to DB in background
      if (formatted.length > 0) {
        supabase
          .from('contact_book')
          .upsert(formatted, {
            onConflict: 'owner_user_id,phone_number',
            ignoreDuplicates: true,
          })
          .then(({ error }) => {
            if (error) console.log('Contact sync error:', error.message);
          });
      }

      setContacts(formatted);
    } catch (e) {
      console.log('Load contacts error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  return { contacts, loading, loadContacts };
}
