// Script to backfill referral tracking data
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function backfillReferrals() {
  console.log('Starting referral backfill process...\n');
  
  // Get all referral codes
  const { data: codes, error: codesError } = await supabase
    .from('referral_codes')
    .select('*')
    .order('code');
    
  if (codesError) {
    console.error('Error fetching codes:', codesError);
    return;
  }
  
  console.log(`Found ${codes.length} referral codes\n`);
  
  for (const code of codes) {
    // Look for users who have this code in their referral_code field
    const { data: usersWithCode, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('referral_code', code.code);
      
    if (usersWithCode && usersWithCode.length > 0) {
      console.log(`\nCode "${code.code}" (ID: ${code.id}):`);
      console.log(`  Found ${usersWithCode.length} users with this code in 'referral_code' field`);
      
      // These users GENERATED this code (they are referrers)
      // Now find users who USED this code
      
      // Check if any users were referred by these users
      const referrerIds = usersWithCode.map(u => u.user_id).filter(Boolean);
      
      if (referrerIds.length > 0) {
        const { data: referredUsers } = await supabase
          .from('user_profiles')
          .select('*')
          .in('referred_by', referrerIds);
          
        if (referredUsers && referredUsers.length > 0) {
          console.log(`  Found ${referredUsers.length} users referred by these users`);
          
          // Update referral_code_used for these users
          for (const referredUser of referredUsers) {
            if (!referredUser.referral_code_used) {
              const { error: updateError } = await supabase
                .from('user_profiles')
                .update({ referral_code_used: code.code })
                .eq('id', referredUser.id);
                
              if (!updateError) {
                console.log(`    ✓ Updated user ${referredUser.school_email} with referral_code_used: ${code.code}`);
              } else {
                console.log(`    ✗ Failed to update user ${referredUser.school_email}:`, updateError.message);
              }
            }
          }
          
          // Also create entries in referrals table if needed
          for (const referredUser of referredUsers) {
            // Check if referral entry already exists
            const { data: existingReferral } = await supabase
              .from('referrals')
              .select('*')
              .eq('referred_user_id', referredUser.user_id)
              .eq('referral_code_id', code.id)
              .single();
              
            if (!existingReferral) {
              const referrerId = referrerIds[0]; // Use first referrer if multiple
              const { error: insertError } = await supabase
                .from('referrals')
                .insert({
                  referrer_id: referrerId,
                  referred_user_id: referredUser.user_id,
                  referral_code_id: code.id,
                  created_at: referredUser.created_at
                });
                
              if (!insertError) {
                console.log(`    ✓ Created referral entry for ${referredUser.school_email}`);
              } else {
                console.log(`    ✗ Failed to create referral entry:`, insertError.message);
              }
            }
          }
        }
      }
    }
  }
  
  console.log('\n\nBackfill complete! Running verification...\n');
  
  // Verify the backfill
  for (const code of codes.filter(c => c.total_uses > 0)) {
    const { data: usersWithCode } = await supabase
      .from('user_profiles')
      .select('school_email')
      .eq('referral_code_used', code.code);
      
    const { data: referrals } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code_id', code.id);
      
    console.log(`Code "${code.code}": ${code.total_uses} total uses`);
    console.log(`  - ${usersWithCode?.length || 0} users in user_profiles`);
    console.log(`  - ${referrals?.length || 0} entries in referrals table`);
  }
}

backfillReferrals().catch(console.error);