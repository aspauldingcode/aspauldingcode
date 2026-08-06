import { LegalPage } from '../_components/LegalPage';

export const metadata = {
  title: 'Whisperer — Privacy Policy',
  description: 'Privacy Policy for the Whisperer app for Apple Watch and iPhone.',
};

export default function WhispererPrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="June 16, 2026">
      <p>
        This Privacy Policy explains how <strong>Whisperer</strong> (the &ldquo;App&rdquo;) — an app for
        Apple Watch with an optional iPhone companion — handles your information. Whisperer lets you chat
        with AI, generate images, scan text from images (OCR), and use voice transcription and
        text-to-speech. By using the App you agree to this policy.
      </p>

      <h2>Who we are</h2>
      <p>
        Whisperer is developed by Alex Spaulding (&ldquo;we&rdquo;, &ldquo;us&rdquo;). You can reach us
        through the contact form at{' '}
        <a href="https://aspauldingcode.com" target="_blank" rel="noopener noreferrer">
          aspauldingcode.com
        </a>
        .
      </p>

      <h2>No account required</h2>
      <p>
        Whisperer does not require you to create an account or provide your email address to use it. We
        do not build advertising profiles, and we do not sell your personal information.
      </p>

      <h2>Information we process</h2>
      <h3>Content you submit</h3>
      <p>
        Your chat messages, any images you submit for OCR or vision, and any audio you record for
        transcription are sent to <strong>OpenAI</strong> to generate responses, transcriptions, and
        images. This content is processed to provide the feature you requested. Your conversation
        history is stored locally on your device; we do not keep a copy of your conversation content on
        our servers.
      </p>

      <h3>Usage and billing data</h3>
      <p>
        To enforce fair-use quotas, the spend cap, the one-time free demo, and any credits or
        subscription you purchase, our server records <strong>usage metadata</strong> tied to a
        randomly generated device identifier. This includes counts and costs of API calls (for example,
        amount in USD, token counts, transcription minutes, timestamps, and the type of request). It
        does <strong>not</strong> include the text or contents of your messages.
      </p>

      <h3>Device identifier and abuse prevention</h3>
      <p>
        We use Apple&rsquo;s <strong>DeviceCheck</strong> framework together with a randomly generated
        device ID to meter usage and to ensure the free demo can only be claimed once per device. This
        identifier is not your name, email, or Apple Account, and is used only for usage metering and
        abuse prevention.
      </p>

      <h3>Your name (optional)</h3>
      <p>
        If you choose to set a profile name in Settings on your Apple Watch or in the iPhone
        companion, it is stored on your devices (via the App Group and WatchConnectivity) and may be
        included in the prompt sent to the AI so it can address you personally. We do not request your
        email address or Apple Account name for this feature.
      </p>

      <h3>Bring Your Own Key (optional)</h3>
      <p>
        If you provide your own OpenAI API key, it is stored securely in your device&rsquo;s Keychain
        and synced privately to your paired Apple Watch. It is used only to authenticate requests you
        make to OpenAI.
      </p>

      <h3>Purchases</h3>
      <p>
        Subscriptions and credit purchases are processed by <strong>Apple</strong> through In-App
        Purchase. We never see your payment card details. We receive transaction identifiers from Apple
        so we can grant the entitlement or credits you bought and honor refunds.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong>OpenAI</strong> — processes the messages, images, and audio you submit to generate
          responses. See OpenAI&rsquo;s privacy policy for how they handle data sent to their API.
        </li>
        <li>
          <strong>Apple</strong> — provides In-App Purchase, DeviceCheck, and WatchConnectivity / App
          Groups used to sync settings between your Apple Watch and iPhone companion.
        </li>
        <li>
          <strong>Vercel</strong> — hosts the backend that meters usage and relays requests. Standard
          server logs (such as IP address and request time) may be processed transiently for security
          and reliability.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Usage metadata is retained as long as needed to operate quotas, the spend cap, credits, and
        billing, and to prevent abuse. Conversation content is retained on your device until you delete
        it there.
      </p>

      <h2>Security</h2>
      <p>
        Network requests are sent over HTTPS and signed to prevent tampering. Sensitive values such as
        your API key are stored in the device Keychain. No method of transmission or storage is 100%
        secure, but we take reasonable measures to protect your information.
      </p>

      <h2>Children</h2>
      <p>
        Whisperer is not directed to children under 13, and we do not knowingly collect personal
        information from children.
      </p>

      <h2>Your choices</h2>
      <p>
        You can remove your saved name and your API key at any time in the App. You can delete your
        conversation history on your device. To request deletion of usage records associated with your
        device identifier, contact us using the link above.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be reflected by
        updating the &ldquo;Last updated&rdquo; date at the top of this page.
      </p>
    </LegalPage>
  );
}
