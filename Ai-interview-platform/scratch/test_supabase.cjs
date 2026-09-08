const SUPABASE_URL = 'https://iqgpxavpimxpcyrxizji.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZ3B4YXZwaW14cGN5cnhpemppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjIyMDc0NiwiZXhwIjoyMDkxNzk2NzQ2fQ.mjy5wH26086LzLXxByI-0VSNpsjtDzC_L8uB9TLoJFo';

async function test() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/test_infos?select=*&limit=5`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
