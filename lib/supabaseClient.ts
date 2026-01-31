
import { createClient } from '@supabase/supabase-js';

// Supabase loyihangiz ma'lumotlari
const supabaseUrl = 'https://nwjohwltjounamednuul.supabase.co';
const supabaseAnonKey = 'sb_publishable_IStu4N-RX-tbpnPsQZlFDQ_Rus5jsNf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
