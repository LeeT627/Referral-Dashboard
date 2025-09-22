import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * GET /api/referral-uses?code=YOUR_CODE
 * Returns: { code: string, uses: number, referredEmails: string[] }
 *
 * This uses a read-only anon key. Ensure your RLS allows SELECT on the referral
 * table for anonymous users, or scope policies appropriately.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Missing 'code' query parameter" },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseServerClient();

    // First, get the referral code info
    const { data: codeData, error: codeError } = await supabase
      .from("referral_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (codeError) {
      console.error("Error fetching referral code:", codeError);
      return NextResponse.json(
        { error: codeError.message },
        { status: 500 }
      );
    }

    if (!codeData) {
      return NextResponse.json({ code, uses: 0, referredEmails: [] });
    }

    // Get all users who used this referral code from user_profiles
    const { data: userProfilesData, error: userProfilesError } = await supabase
      .from("user_profiles")
      .select("school_email, user_id")
      .eq("referral_code_used", code);

    if (userProfilesError) {
      console.error("Error fetching user profiles:", userProfilesError);
      return NextResponse.json(
        { error: userProfilesError.message },
        { status: 500 }
      );
    }

    // Also get referred users from the referrals table using the referral_code_id
    const { data: referralsData, error: referralsError } = await supabase
      .from("referrals")
      .select(`
        referred_user_id,
        user_profiles!referrals_referred_user_id_fkey(school_email, user_id)
      `)
      .eq("referral_code_id", codeData.id);

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
    }

    // Combine emails from both sources and remove duplicates
    const emailsFromProfiles = userProfilesData?.map((user: { school_email: string | null }) => user.school_email).filter(Boolean) || [];
    
    const emailsFromReferrals = referralsData?.map((referral: { 
      referred_user_id: string;
      user_profiles?: { school_email: string | null; user_id: string } 
    }) => {
      return referral.user_profiles?.school_email;
    }).filter(Boolean) || [];

    // Combine and deduplicate emails
    const allEmails = [...new Set([...emailsFromProfiles, ...emailsFromReferrals])];
    const referredEmails = allEmails.filter(Boolean);
    
    const uses = codeData.total_uses || referredEmails.length;

    console.log(`Found ${referredEmails.length} referred emails for code ${code}`);

    return NextResponse.json({ code, uses, referredEmails });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

