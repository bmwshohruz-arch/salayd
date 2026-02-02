
import { createClient } from '@supabase/supabase-js';

/**
 * Foydalanuvchi taqdim etgan Supabase loyiha ma'lumotlari.
 * Bu ma'lumotlar admin panel sozlamalarini va taqdimotlar tarixini 
 * saqlash uchun ishlatiladi.
 */
const supabaseUrl = 'https://nwjohwltjounamednuul.supabase.co';
const supabaseAnonKey = 'sb_publishable_IStu4N-RX-tbpnPsQZlFDQ_Rus5jsNf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
