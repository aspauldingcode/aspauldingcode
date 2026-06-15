import { LegalPage } from '../_components/LegalPage';

export const metadata = {
  title: 'Whisperer — Terms of Use',
  description: 'Terms of Use (EULA) for the Whisperer app for Apple Watch and iPhone.',
};

export default function WhispererTermsOfUse() {
  return (
    <LegalPage title="Terms of Use" lastUpdated="June 15, 2026">
      <p>
        These Terms of Use (&ldquo;Terms&rdquo;) govern your use of <strong>Whisperer</strong> (the
        &ldquo;App&rdquo;), an app for Apple Watch with an optional iPhone companion. By downloading or
        using the App you agree to these Terms. If you do not agree, do not use the App.
      </p>

      <h2>The service</h2>
      <p>
        Whisperer lets you chat with AI, generate images, scan text from images, and use voice
        transcription and text-to-speech. The App relies on third-party AI services (OpenAI) to produce
        results. AI output can be inaccurate, incomplete, or offensive; you are responsible for
        evaluating output before relying on it. Whisperer is not a substitute for professional advice.
      </p>

      <h2>Free demo, subscriptions, and credits</h2>
      <ul>
        <li>
          <strong>Free demo.</strong> Each device may receive a one-time, limited free demo. The demo is
          provided as-is and may be changed or discontinued.
        </li>
        <li>
          <strong>Whisperer Plus.</strong> An auto-renewing subscription that unlocks Plus features and
          a hosted usage budget. Pricing and billing period are shown in the App at the time of
          purchase.
        </li>
        <li>
          <strong>Credits.</strong> Optional, one-time consumable purchases that extend your usage
          beyond the included monthly quota and any spend cap you set. Your included budget is always
          used first; credits are consumed only after it is used up. Credits are non-transferable.
        </li>
        <li>
          <strong>Bring Your Own Key (BYOK).</strong> You may instead supply your own OpenAI API key to
          continue limited use without a subscription. BYOK does not unlock Plus features, and you are
          responsible for any charges OpenAI bills to your key.
        </li>
      </ul>

      <h2>Billing and cancellation</h2>
      <p>
        Subscriptions are sold through Apple In-App Purchase. Payment is charged to your Apple Account
        at confirmation of purchase. Subscriptions automatically renew unless auto-renew is turned off
        at least 24 hours before the end of the current period. Your Apple Account is charged for
        renewal within 24 hours before the end of the current period. You can manage or cancel your
        subscription in your Apple Account settings after purchase. Purchases, refunds, and billing are
        handled by Apple in accordance with the{' '}
        <a
          href="https://www.apple.com/legal/internet-services/itunes/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Apple Media Services Terms and Conditions
        </a>
        .
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to use the App to:</p>
      <ul>
        <li>violate any law or the rights of others;</li>
        <li>generate or distribute unlawful, harmful, or abusive content;</li>
        <li>attempt to bypass quotas, the spend cap, metering, or abuse-prevention measures;</li>
        <li>reverse engineer, resell, or misuse the service or its underlying APIs.</li>
      </ul>
      <p>
        You are responsible for the content you submit and must have the rights to any images, audio, or
        text you provide.
      </p>

      <h2>Privacy</h2>
      <p>
        Your use of the App is also governed by our{' '}
        <a href="/whisperer/privacy">Privacy Policy</a>.
      </p>

      <h2>Disclaimers</h2>
      <p>
        THE APP IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY
        KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        AND NON-INFRINGEMENT. We do not warrant that the App will be uninterrupted, error-free, or that
        AI output will be accurate.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
        special, consequential, or punitive damages, or any loss of data, arising from your use of the
        App. Our total liability for any claim relating to the App will not exceed the amount you paid
        for the App in the twelve months before the claim.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may modify or discontinue the App or these Terms at any time. Material changes to these Terms
        will be reflected by updating the &ldquo;Last updated&rdquo; date above. We may suspend access
        for violations of these Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms? Reach us through the contact form at{' '}
        <a href="https://aspauldingcode.com" target="_blank" rel="noopener noreferrer">
          aspauldingcode.com
        </a>
        .
      </p>
    </LegalPage>
  );
}
