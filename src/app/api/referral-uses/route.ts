import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseClient";

/**
 * GET /api/referral-uses?code=YOUR_CODE
 * Returns: { code: string, uses: number }
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

  const table = process.env.REFERRAL_CODES_TABLE || "referral_codes";
  const codeColumn = process.env.REFERRAL_CODE_COLUMN || "code";
  const usesColumn = process.env.REFERRAL_USES_COLUMN || "uses";
  const fallbackColumn = "total_uses"; // try this if `uses` isn't present

  try {
    const supabase = getSupabaseServerClient();

    // Select all columns to avoid TS parsing issues with dynamic column lists
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq(codeColumn, code)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ code, uses: 0 });
    }

    const row = data as Record<string, unknown>;

    const pickNumber = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const uses = pickNumber(
      row[usesColumn] ?? row[fallbackColumn] ?? 0
    );

    return NextResponse.json({ code, uses });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

