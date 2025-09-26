// Script to investigate why some codes have no tracked users
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function investigateMissing() {
  console.log('Investigating codes with missing user tracking...\n');
  
  // Codes that show uses but no users tracked
  const missingCodes = ['IITD009', 'IITD010', 'IITD015', 'IITD019'];
  
  for (const codeStr of missingCodes) {
    console.log(`\nInvestigating code: ${codeStr}`);
    
    // Get the code details
    const { data: code } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', codeStr)
      .single();
      
    if (code) {
      console.log(`  Total uses: ${code.total_uses}`);
      console.log(`  Created at: ${code.created_at}`);
      console.log(`  Referrer ID: ${code.referrer_id}`);
      
      // Check if any users have this in referred_by field matching the referrer_id
      if (code.referrer_id) {
        const { data: referredByUsers } = await supabase
          .from('user_profiles')
          .select('id, user_id, school_email, referred_by, referral_code_used, created_at')
          .eq('referred_by', code.referrer_id);
          
        if (referredByUsers && referredByUsers.length > 0) {
          console.log(`  Found ${referredByUsers.length} users referred by ${code.referrer_id}`);
          
          // Update these users with the referral code
          for (const user of referredByUsers) {
            if (!user.referral_code_used) {
              const { error } = await supabase
                .from('user_profiles')
                .update({ referral_code_used: codeStr })
                .eq('id', user.id);
                
              if (!error) {
                console.log(`    ✓ Updated ${user.school_email} with referral_code_used: ${codeStr}`);
              }
            } else {
              console.log(`    - ${user.school_email} already has referral_code_used: ${user.referral_code_used}`);
            }
          }
        } else {
          console.log(`  No users found with referred_by = ${code.referrer_id}`);
        }
      }
      
      // Also check for case-insensitive matches
      const { data: caseInsensitive } = await supabase
        .from('user_profiles')
        .select('school_email, referral_code_used')
        .ilike('referral_code_used', codeStr);
        
      if (caseInsensitive && caseInsensitive.length > 0) {
        console.log(`  Case-insensitive matches: ${caseInsensitive.length}`);
      }
    }
  }
  
  console.log('\n\nFinal verification:\n');
  
  for (const codeStr of missingCodes) {
    const { data: code } = await supabase
      .from('referral_codes')
      .select('total_uses')
      .eq('code', codeStr)
      .single();
      
    const { data: users } = await supabase
      .from('user_profiles')
      .select('school_email')
      .eq('referral_code_used', codeStr);
      
    console.log(`${codeStr}: ${code?.total_uses || 0} uses, ${users?.length || 0} tracked users`);
  }
}

investigateMissing().catch(console.error);