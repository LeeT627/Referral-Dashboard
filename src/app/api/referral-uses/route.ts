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

    // Get all users who used this referral code directly from user_profiles
    const { data: usersData, error: usersError } = await supabase
      .from("user_profiles")
      .select("school_email")
      .eq("referral_code_used", code);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    // Extract emails and filter out nulls
    const referredEmails = usersData
      ? usersData
          .map((user: { school_email: string | null }) => user.school_email)
          .filter((email): email is string => !!email)
      : [];

    // Remove duplicates (shouldn't be any, but just in case)
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

