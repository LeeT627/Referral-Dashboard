import ReferralDashboard from "@/components/ReferralDashboard";

export default function Home() {
  return (
    <div className="font-sans min-h-screen p-8 sm:p-20">
      <main className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Referral Dashboard</h1>
        <p className="text-sm text-neutral-600 mb-6">
          Enter a referral code to view its total uses.
        </p>
        <ReferralDashboard />
      </main>
    </div>
  );
}
