// Script to check what referral codes exist in database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDatabase() {
  console.log('Checking database for referral codes...\n');
  
  // Get sample referral codes
  const { data: codes, error: codesError } = await supabase
    .from('referral_codes')
    .select('code, total_uses, is_active')
    .limit(5);
    
  if (codesError) {
    console.error('Error fetching referral codes:', codesError);
    return;
  }
  
  console.log('Sample referral codes in database:');
  codes?.forEach(code => {
    console.log(`- ${code.code} (uses: ${code.total_uses}, active: ${code.is_active})`);
  });
  
  // Get users with referral codes
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('referral_code_used, school_email')
    .not('referral_code_used', 'is', null)
    .limit(5);
    
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }
  
  console.log('\nSample users with referral codes:');
  users?.forEach(user => {
    console.log(`- Used code: ${user.referral_code_used}, Email: ${user.school_email}`);
  });
  
  // Check a specific code if it exists
  if (codes && codes.length > 0) {
    const testCode = codes[0].code;
    console.log(`\nTesting with code: ${testCode}`);
    
    const { data: testUsers, error: testError } = await supabase
      .from('user_profiles')
      .select('school_email')
      .eq('referral_code_used', testCode);
      
    if (testError) {
      console.error('Error:', testError);
    } else {
      console.log(`Found ${testUsers?.length || 0} users who used this code`);
      if (testUsers && testUsers.length > 0) {
        console.log('Emails:', testUsers.map(u => u.school_email));
      }
    }
  }
}

checkDatabase().catch(console.error);