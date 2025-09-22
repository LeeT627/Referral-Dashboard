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

    // Get all referred users and their emails using the referral code ID
    const { data: referralsData, error: referralsError } = await supabase
      .from("referrals")
      .select("user_profiles(school_email)")
      .eq("referral_code_id", codeData.id);

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
      return NextResponse.json(
        { error: referralsError.message },
        { status: 500 }
      );
    }

    // Extract emails from the nested structure
    const referredEmails = referralsData
      ? referralsData
          .map((ref: { user_profiles: { school_email: string | null } | null }) => ref.user_profiles?.school_email)
          .filter((email): email is string => !!email)
      : [];

    // Remove duplicates
    const uniqueEmails = [...new Set(referredEmails)];

    const uses = codeData.total_uses || uniqueEmails.length;

    return NextResponse.json({ code, uses, referredEmails: uniqueEmails });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

