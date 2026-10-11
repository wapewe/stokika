// Supabase Edge Function to serve config securely
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    const origin = req.headers.get('origin') || 'https://www.stokika.com';
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Credentials': 'true'
            }
        });
    }

    const referer = req.headers.get('referer');
    
    const allowedDomains = [
        'stokika.com',
        'localhost',
        '127.0.0.1'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
        origin?.includes(domain) || referer?.includes(domain)
    );
    
    if (!isAllowed && (origin || referer)) {
        return new Response('Forbidden', { status: 403 });
    }

    // Get Supabase credentials from environment
    // Supabase automatically provides SUPABASE_URL and SUPABASE_ANON_KEY
    // If not available, try custom secret names
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                        Deno.env.get('PUBLIC_SUPABASE_URL') ||
                        'https://eidsqrnwfndruuufyacc.supabase.co';
    
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ||
                           Deno.env.get('PUBLIC_ANON_KEY') ||
                           '';

    // If no anon key found, return error
    if (!supabaseAnonKey) {
        return new Response(
            JSON.stringify({ error: 'Configuration not available' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin
                }
            }
        );
    }

    return new Response(
        JSON.stringify({
            supabaseUrl,
            supabaseAnonKey
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Credentials': 'true'
            }
        }
    );
});
