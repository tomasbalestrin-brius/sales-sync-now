import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetRow {
  form_submitted_at?: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  notes?: string;
}

async function getGoogleSheetsAccessToken() {
  const clientEmail = Deno.env.get('GOOGLE_SHEETS_CLIENT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SHEETS_PRIVATE_KEY');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Sheets credentials');
  }

  // Create JWT for Google OAuth
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import private key for signing
  const pemKey = privateKey.replace(/\\n/g, '\n');
  const keyData = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    console.error('Token error:', tokenData);
    throw new Error('Failed to get access token');
  }

  return tokenData.access_token;
}

async function fetchSheetData(accessToken: string, sheetId: string, sheetName: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A:Z`;
  
  console.log('Sheet ID being used:', sheetId);
  console.log('Sheet name:', sheetName);
  console.log('Full URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Sheet fetch error:', error);
    throw new Error('Failed to fetch sheet data');
  }

  return await response.json();
}

function parseSheetData(data: any): SheetRow[] {
  const rows = data.values || [];
  
  if (rows.length === 0) {
    return [];
  }

  // First row is headers
  const headers = rows[0];
  
  // Column A is index 0 (form submission date)
  const dateIndex = 0;
  
  // Find column indices based on your sheet structure
  const nameIndex = headers.findIndex((h: string) => 
    h?.includes('nome completo') || h?.includes('name')
  );
  const emailIndex = headers.findIndex((h: string) => 
    h?.toLowerCase().includes('email') || h?.toLowerCase().includes('e-mail')
  );
  const phoneIndex = headers.findIndex((h: string) => 
    h?.includes('WhatsApp') || h?.includes('whatsapp') || h?.includes('telefone')
  );
  const sourceIndex = headers.findIndex((h: string) => 
    h?.toLowerCase() === 'fonte' || h?.toLowerCase() === 'source'
  );
  const businessIndex = headers.findIndex((h: string) => 
    h?.includes('negócio') || h?.includes('business')
  );
  const nicheIndex = headers.findIndex((h: string) => 
    h?.includes('nicho') || h?.includes('niche')
  );
  const revenueIndex = headers.findIndex((h: string) => 
    h?.includes('faturamento') || h?.includes('revenue')
  );

  console.log('Column mapping:', {
    nameIndex,
    emailIndex,
    phoneIndex,
    sourceIndex,
    businessIndex,
    nicheIndex,
    revenueIndex,
  });

  const leads: SheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[nameIndex]) continue;

    // Build notes from additional fields
    const notesArray = [];
    if (businessIndex >= 0 && row[businessIndex]) {
      notesArray.push(`Negócio: ${row[businessIndex]}`);
    }
    if (nicheIndex >= 0 && row[nicheIndex]) {
      notesArray.push(`Nicho: ${row[nicheIndex]}`);
    }
    if (revenueIndex >= 0 && row[revenueIndex]) {
      notesArray.push(`Faturamento: ${row[revenueIndex]}`);
    }

    leads.push({
      form_submitted_at: row[dateIndex] || undefined,
      name: row[nameIndex] || '',
      email: emailIndex >= 0 ? row[emailIndex] : undefined,
      phone: phoneIndex >= 0 ? row[phoneIndex] : undefined,
      source: sourceIndex >= 0 ? (row[sourceIndex] || 'Google Sheets') : 'Google Sheets',
      notes: notesArray.length > 0 ? notesArray.join(' | ') : undefined,
    });
  }

  console.log(`Parsed ${leads.length} leads from sheet`);
  return leads;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('Starting Google Sheets sync...');

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get sync config for 50 Scripts
    const { data: syncConfig, error: configError } = await supabase
      .from('sync_config')
      .select('*')
      .eq('product_name', '50 Scripts')
      .single();

    if (configError || !syncConfig) {
      throw new Error('Sync configuration not found for 50 Scripts');
    }

    if (!syncConfig.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Sync is currently disabled for 50 Scripts',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get Google Sheets access token
    console.log('Getting Google Sheets access token...');
    const accessToken = await getGoogleSheetsAccessToken();

    // Fetch sheet data
    console.log('Fetching sheet data...');
    const sheetData = await fetchSheetData(accessToken, syncConfig.sheet_id, syncConfig.sheet_tab_name);

    // Parse data
    console.log('Parsing sheet data...');
    const leads = parseSheetData(sheetData);
    console.log(`Found ${leads.length} leads in sheet`);

    // Insert leads (skip duplicates by email/phone)
    let inserted = 0;
    let skipped = 0;

    for (const lead of leads) {
      // Check if lead already exists
      const { data: existing } = await supabase
        .from('fifty_scripts_leads')
        .select('id')
        .or(`email.eq.${lead.email},phone.eq.${lead.phone}`)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      // Parse date from Google Sheets format (e.g., "10/11/2025 17:30:45")
      let parsedDate = null;
      if (lead.form_submitted_at) {
        try {
          const dateStr = lead.form_submitted_at;
          parsedDate = new Date(dateStr).toISOString();
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }

      // Insert new lead
      const { error } = await supabase
        .from('fifty_scripts_leads')
        .insert({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          notes: lead.notes,
          status: 'novo',
          form_submitted_at: parsedDate,
        });

      if (error) {
        console.error('Error inserting lead:', error);
        skipped++;
      } else {
        inserted++;
      }
    }

    // Update last sync timestamp
    await supabase
      .from('sync_config')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('product_name', '50 Scripts');

    console.log(`Sync complete. Inserted: ${inserted}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        stats: {
          total: leads.length,
          inserted,
          skipped,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
