"use client";

import { useState } from "react";

export default function ReferralDashboard() {
  const [code, setCode] = useState("");
  const [uses, setUses] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUses(null);
    if (!code.trim()) {
      setError("Please enter a referral code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/referral-uses?code=${encodeURIComponent(code.trim())}`);
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg = (data as { error?: string })?.error ?? "Failed to fetch";
        throw new Error(msg);
      }
      const usesVal = (data as { uses?: number })?.uses ?? 0;
      setUses(usesVal);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm font-medium" htmlFor="referral-code">
          Enter referral code
        </label>
        <input
          id="referral-code"
          type="text"
          placeholder="e.g. SUMMER2025"
          className="border rounded px-3 py-2"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check uses"}
        </button>
      </form>

      <div className="mt-4 min-h-[2rem]">
        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {uses !== null && !error && (
          <p className="text-sm">
            Total uses for <span className="font-semibold">{code}</span>: {uses}
          </p>
        )}
      </div>
    </div>
  );
}

