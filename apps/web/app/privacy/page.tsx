export default function PrivacyPage() {
    return (
        <main className="max-w-2xl mx-auto py-16 px-4">
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

            <p className="text-sm text-gray-500 mb-6">Last updated: June 2026</p>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
                <p>We collect information you provide directly (name, email) and data from connected social accounts (TikTok, Instagram, YouTube) that you explicitly authorize.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">2. TikTok Data</h2>
                <p>When you connect your TikTok account, we collect and store: your display name, avatar, follower count, following count, total likes, video count, and video engagement metrics (views, likes, comments, shares). This data is displayed on your public profile on our platform and used to match you with relevant brand campaigns.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>To display your influencer profile to brands</li>
                    <li>To calculate engagement rate and analytics</li>
                    <li>To match you with relevant brand partnerships</li>
                    <li>To improve our platform</li>
                </ul>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>
                <p>We do not sell your personal data. Your statistics are visible to registered brands on our platform. We do not share your data with third parties except as required by law.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">5. Data Retention</h2>
                <p>We retain your data as long as your account is active. You can request deletion of your data by contacting us.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">6. Security</h2>
                <p>We use industry-standard encryption to protect your data. TikTok access tokens are stored securely and never exposed via our API.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">7. Your Rights</h2>
                <p>You can disconnect your TikTok account at any time. You can request access to, correction of, or deletion of your personal data.</p>
            </section>

            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">8. Contact</h2>
                <p>For privacy questions: support@influencermarket.com</p>
            </section>
        </main>
    );
}