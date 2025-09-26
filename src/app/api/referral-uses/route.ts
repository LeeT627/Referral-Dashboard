import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * GET /api/referral-uses?code=YOUR_CODE
 * Returns: { code: string, uses: number, referredEmails: string[] }
 *
 * This queries the user_profiles table directly to find all users
 * who have used a specific referral code.
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
      return NextResponse.json({ 
        code, 
        uses: 0, 
        referredEmails: [],
        message: "Referral code not found"
      });
    }

    // Get all users who used this referral code directly from user_profiles
    const { data: usersData, error: usersError } = await supabase
      .from("user_profiles")
      .select("school_email, user_id")
      .eq("referral_code_used", code);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    // Also try to get referrals from the referrals table using the code ID
    const { data: referralsData, error: referralsError } = await supabase
      .from("referrals")
      .select(`
        referred_user_id,
        user_profiles:referred_user_id(school_email)
      `)
      .eq("referral_code_id", codeData.id);

    if (referralsError) {
      console.error("Error fetching from referrals table:", referralsError);
    }

    // Extract emails from user_profiles table
    const emailsFromProfiles = usersData
      ? usersData
          .map((user: { school_email: string | null }) => user.school_email)
          .filter((email): email is string => !!email)
      : [];

    // Extract emails from referrals table (if any)
    const emailsFromReferrals: string[] = [];
    if (referralsData) {
      for (const referral of referralsData) {
        const profiles = referral.user_profiles as { school_email?: string } | { school_email?: string }[] | null;
        if (Array.isArray(profiles) && profiles[0]?.school_email) {
          emailsFromReferrals.push(profiles[0].school_email);
        } else if (profiles && !Array.isArray(profiles) && profiles.school_email) {
          emailsFromReferrals.push(profiles.school_email);
        }
      }
    }

    // Combine and deduplicate emails
    const allEmails = [...new Set([...emailsFromProfiles, ...emailsFromReferrals])];
    const uniqueEmails = allEmails.filter(Boolean);

    // Use total_uses from referral_codes table as the authoritative count
    const uses = codeData.total_uses || 0;

    // Add debug info if no emails found but uses > 0
    const debugInfo = uses > 0 && uniqueEmails.length === 0 
      ? "Note: The referral code shows usage but no user emails are linked in the database. The referral tracking may use a different mechanism."
      : null;

    return NextResponse.json({ 
      code, 
      uses, 
      referredEmails: uniqueEmails,
      debugInfo,
      codeActive: codeData.is_active || false
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

