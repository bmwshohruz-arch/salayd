
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase loyihasi uchun ulanish ma'lumotlari.
 * Foydalanuvchi taqdim etgan URL va API kalit.
 */
const supabaseUrl = 'https://nwjohwltjounamednuul.supabase.co';
const supabaseAnonKey = 'sb_publishable_IStu4N-RX-tbpnPsQZlFDQ_Rus5jsNf';

// Supabase clientni yaratishda xatolik bo'lsa, logga chiqarish
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Ulanishni tekshirish uchun yordamchi funksiya
 */
export const checkSupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('site_settings').select('count', { count: 'exact', head: true });
    return !error;
  } catch (e) {
    return false;
  }
};
