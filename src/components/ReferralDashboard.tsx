"use client";

import { useState } from "react";

interface ReferralData {
  code: string;
  uses: number;
  referredEmails: string[];
  debugInfo?: string | null;
  codeActive?: boolean;
  message?: string;
}

export default function ReferralDashboard() {
  const [code, setCode] = useState("");
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setData(null);
    if (!code.trim()) {
      setError("Please enter a referral code.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/referral-uses?code=${encodeURIComponent(code.trim())}`);
      const responseData = await res.json() as ReferralData | { error?: string };
      if (!res.ok) {
        const msg = 'error' in responseData ? responseData.error : "Failed to fetch";
        throw new Error(msg);
      }
      setData(responseData as ReferralData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
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

      <div className="mt-6">
        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {data && !error && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold">
                Referral Code: <span className="text-lg">{data.code}</span>
                {data.codeActive !== undefined && (
                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                    data.codeActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {data.codeActive ? 'Active' : 'Inactive'}
                  </span>
                )}
              </p>
              <p className="text-sm text-neutral-600">
                Total uses: {data.uses}
              </p>
            </div>
            
            {data.debugInfo && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ℹ️ {data.debugInfo}
                </p>
              </div>
            )}
            
            {data.referredEmails.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Referred Users ({data.referredEmails.length}):</h3>
                <div className="bg-neutral-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <ul className="space-y-1">
                    {data.referredEmails.map((email, index) => (
                      <li key={index} className="text-sm py-1 border-b border-neutral-200 last:border-0">
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {data.referredEmails.length === 0 && data.uses === 0 && (
              <p className="text-sm text-neutral-500 italic">
                No users have used this referral code yet.
              </p>
            )}
            
            {data.message && (
              <p className="text-sm text-neutral-600">
                {data.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

