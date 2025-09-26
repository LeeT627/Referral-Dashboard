# Fix Signup Referral Tracking

## Current Issue
New users who sign up with referral codes are NOT being tracked in the dashboard because the signup process doesn't save the referral code to the database.

## What Needs to Be Fixed

In your main application's signup/registration flow, when a user signs up with a referral code, you need to:

### 1. Update the `user_profiles` table
When creating/updating the user profile, include the referral code:

```javascript
// In your signup handler
await supabase
  .from('user_profiles')
  .update({ 
    referral_code_used: referralCode  // The code they used to sign up
  })
  .eq('user_id', userId);
```

### 2. Create entry in `referrals` table (optional but recommended)
```javascript
// Get the referral code details
const { data: codeData } = await supabase
  .from('referral_codes')
  .select('id, referrer_id')
  .eq('code', referralCode)
  .single();

if (codeData) {
  // Create referral record
  await supabase
    .from('referrals')
    .insert({
      referrer_id: codeData.referrer_id,
      referred_user_id: userId,
      referral_code_id: codeData.id,
      created_at: new Date().toISOString()
    });
}
```

### 3. Update the referrer's referred_by field
If you track who referred whom:
```javascript
await supabase
  .from('user_profiles')
  .update({ 
    referred_by: codeData.referrer_id  // ID of the user who referred them
  })
  .eq('user_id', userId);
```

## Where to Add This Code

Look for these locations in your main app:
- Auth callback handlers
- Signup form submission handlers
- User profile creation functions
- OAuth callback handlers

Search for:
- `supabase.auth.signUp`
- `createUserProfile`
- `onAuthStateChange`
- Where you handle the referral code from URL params or form input

## Testing

After implementing:
1. Sign up a new user with a referral code
2. Check the dashboard - the new user should appear immediately
3. Verify in the database:
   ```sql
   SELECT * FROM user_profiles WHERE referral_code_used = 'YOUR_CODE';
   ```

## Already Backfilled Data

We've already backfilled historical data for these codes:
- IITD001: 12 users
- IITD008: 63 users
- iitdutsavi: 37 users
- And others (130 total users)

Codes that couldn't be backfilled (no referrer_id):
- IITD010: 21 uses
- IITD015: 4 uses
- IITD019: 4 uses
- IITD009: 1 use