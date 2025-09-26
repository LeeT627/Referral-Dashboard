// Script to explore what data we can use to track referrals
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function exploreTracking() {
  console.log('Exploring tracking possibilities...\n');
  
  // 1. Check if there's any audit log or activity tracking
  try {
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables', {});
    if (!tablesError && tables) {
      console.log('Available tables:', tables);
    }
  } catch (e) {
    // RPC not available
  }
  
  // 2. Check user_profiles structure
  const { data: sampleUsers, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(3);
    
  if (sampleUsers && sampleUsers.length > 0) {
    console.log('\nSample user_profiles columns:');
    console.log(Object.keys(sampleUsers[0]));
    
    // Check if there's any timestamp that might help
    const hasCreatedAt = 'created_at' in sampleUsers[0];
    const hasSignupDate = 'signup_date' in sampleUsers[0];
    console.log('Has created_at?', hasCreatedAt);
    console.log('Has signup_date?', hasSignupDate);
  }
  
  // 3. Check if there's a signup_logs or user_signups table
  const possibleTables = [
    'user_signups',
    'signup_logs',
    'auth_logs',
    'activity_logs',
    'user_registrations',
    'referral_logs'
  ];
  
  console.log('\nChecking for tracking tables...');
  for (const tableName of possibleTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (!error) {
      console.log(`✓ Found table: ${tableName}`);
      if (data && data.length > 0) {
        console.log(`  Columns: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }
  
  // 4. Check auth.users table if accessible
  try {
    const { data: authTest, error: authError } = await supabase
      .from('auth.users')
      .select('*')
      .limit(1);
      
    if (!authError && authTest) {
      console.log('\n✓ auth.users table is accessible');
      if (authTest.length > 0) {
        console.log('  Columns:', Object.keys(authTest[0]).join(', '));
      }
    }
  } catch (e) {
    // auth.users not accessible
  }
  
  // 5. Check if referral_codes has any relationship data
  const { data: codeWithUses } = await supabase
    .from('referral_codes')
    .select('*')
    .gt('total_uses', 0)
    .limit(1)
    .single();
    
  if (codeWithUses) {
    console.log('\nReferral code structure:');
    console.log(Object.keys(codeWithUses));
    
    // Check if there's a created_by or owner field
    if ('created_by' in codeWithUses || 'user_id' in codeWithUses || 'owner_id' in codeWithUses) {
      console.log('Code has owner reference!');
    }
  }
  
  // 6. Look for any metadata or raw_user_meta_data
  const { data: userWithMeta } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1)
    .single();
    
  if (userWithMeta) {
    const metaFields = Object.keys(userWithMeta).filter(key => 
      key.includes('meta') || key.includes('data') || key.includes('referral')
    );
    if (metaFields.length > 0) {
      console.log('\nFound potential metadata fields:', metaFields);
      metaFields.forEach(field => {
        if (userWithMeta[field]) {
          console.log(`${field}:`, userWithMeta[field]);
        }
      });
    }
  }
}

exploreTracking().catch(console.error);