// Test script to check API response
const testReferralCode = 'SUMMER2025'; // Replace with a known referral code

async function testAPI() {
  try {
    const response = await fetch(`http://localhost:3001/api/referral-uses?code=${testReferralCode}`);
    const data = await response.json();
    
    console.log('API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.error('Error from API:', data.error);
    } else {
      console.log('\nSummary:');
      console.log('- Referral Code:', data.code);
      console.log('- Total Uses:', data.uses);
      console.log('- Number of Emails:', data.referredEmails?.length || 0);
      if (data.referredEmails && data.referredEmails.length > 0) {
        console.log('- Emails:', data.referredEmails);
      }
    }
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
}

testAPI();