// Script to check how referrals are tracked
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkReferrals() {
  console.log('Checking how referrals are tracked...\n');
  
  // Check the referrals table
  const { data: referrals, error: refError } = await supabase
    .from('referrals')
    .select('*')
    .limit(5);
    
  if (refError) {
    console.error('Error fetching referrals:', refError);
  } else {
    console.log('Sample from referrals table:');
    console.log(referrals);
  }
  
  // Get a referral code with uses > 0
  const { data: activeCode, error: codeError } = await supabase
    .from('referral_codes')
    .select('*')
    .gt('total_uses', 0)
    .limit(1)
    .single();
    
  if (activeCode) {
    console.log(`\nChecking code "${activeCode.code}" with ${activeCode.total_uses} uses:`);
    console.log('Code ID:', activeCode.id);
    
    // Check referrals table for this code
    const { data: codeReferrals, error: refErr } = await supabase
      .from('referrals')
      .select(`
        *,
        referred_profiles:user_profiles!referrals_referred_user_id_fkey(school_email, user_id)
      `)
      .eq('referral_code_id', activeCode.id);
      
    if (refErr) {
      console.error('Error checking referrals:', refErr);
    } else {
      console.log(`Found ${codeReferrals?.length || 0} referrals for this code`);
      if (codeReferrals && codeReferrals.length > 0) {
        console.log('Referrals:', JSON.stringify(codeReferrals, null, 2));
      }
    }
    
    // Also check user_profiles with this code
    const { data: profileUsers, error: profErr } = await supabase
      .from('user_profiles')
      .select('user_id, school_email, referral_code_used')
      .eq('referral_code_used', activeCode.code);
      
    console.log(`\nUsers in user_profiles with referral_code_used="${activeCode.code}": ${profileUsers?.length || 0}`);
    if (profileUsers && profileUsers.length > 0) {
      console.log('Users:', profileUsers);
    }
  }
}

checkReferrals().catch(console.error);