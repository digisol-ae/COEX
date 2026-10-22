import Link from 'next/link';
import { LegalPage } from '@/components/legal-page';

export const metadata = {
  title: 'Terms of Use | COEX',
  description:
    'Terms for authorised use of the COEX business platform and Microsoft Teams integration.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <section>
        <h2>1. About these terms</h2>
        <p>
          These terms govern authorised use of COEX, operated by Digisol LLC-FZ (DigiSol), including
          its customer portal and Microsoft Teams integration when enabled. Use the service only if
          you are authorised by the organisation responsible for your workspace and agree to these
          terms. If you do not agree, do not use it and contact your administrator.
        </p>
        <p>
          A separate written agreement between DigiSol and your organisation takes precedence where
          it addresses the same subject. These terms do not replace an agreed service level,
          confidentiality obligation, data-processing arrangement or other written commitment, and
          do not exclude rights that cannot lawfully be excluded.
        </p>
      </section>
      <section>
        <h2>2. Accounts and permitted use</h2>
        <p>
          COEX is a business platform for authorised staff and customer contacts. Access depends on
          your account status and assigned permissions. Protect your credentials, use your own
          account, sign out on shared devices and promptly report suspected unauthorised access.
          Workspace administrators are responsible for reviewing access and removing it when no
          longer needed.
        </p>
      </section>
      <section>
        <h2>3. Your information and responsibilities</h2>
        <p>
          You and your organisation retain the rights you hold in information submitted to COEX. You
          authorise DigiSol and its service providers to store, process, transmit and back up that
          information as needed to operate, secure and support the service and meet applicable
          obligations.
        </p>
        <p>
          Submit only information you are entitled to use and share. Check its accuracy and choose
          appropriate recipients and workspace access. Do not upload passwords, authentication
          secrets or unnecessary sensitive information into tasks or messages. Your organisation is
          responsible for its instructions, business decisions and lawful use of employee and
          customer information.
        </p>
      </section>
      <section>
        <h2>4. Microsoft Teams and other integrations</h2>
        <p>
          The Teams action creates a COEX task only after you submit its form. Review the title,
          description, destination, assignee and due date before creating it. A task’s COEX audience
          may differ from the source Teams conversation. The original message link does not grant
          access to that conversation or change Microsoft permissions.
        </p>
        <p>
          Removing an integration does not remove information already saved in COEX. External
          services are governed by their providers’ terms and may change or become unavailable. A
          task-creation error can occur after a task has been saved; check COEX before opening a new
          form to avoid duplicates.
        </p>
      </section>
      <section>
        <h2>5. Prohibited activity</h2>
        <p>
          Do not access another account or workspace without authority, bypass access restrictions,
          upload malicious code, disrupt the service, send unlawful or abusive content, or infringe
          privacy or intellectual-property rights. Security testing requires prior authorisation and
          an agreed scope.
        </p>
      </section>
      <section>
        <h2>6. Privacy and confidentiality</h2>
        <p>
          The <Link href="/privacy">Privacy Policy</Link> describes personal-information handling.
          Keep confidential business and customer information within its authorised audience.
          Workspace permissions and notification settings affect who can receive submitted
          information; they do not replace your organisation’s confidentiality requirements.
        </p>
      </section>
      <section>
        <h2>7. Availability, changes and support</h2>
        <p>
          DigiSol may maintain, correct and update the service. Availability and functionality can
          be affected by maintenance, internet connectivity and third-party services. Unless a
          separate agreement provides otherwise, uninterrupted or error-free operation is not
          guaranteed. Check important records and arrange any exports or recovery arrangements your
          business requires with your administrator.
        </p>
        <p>
          Report faults or request access through your administrator or{' '}
          <a href="mailto:info@digisol.ae">info@digisol.ae</a>. The service is not an emergency
          reporting channel.
        </p>
      </section>
      <section>
        <h2>8. Suspension and ending access</h2>
        <p>
          Your organisation or DigiSol may restrict access where necessary to enforce permissions,
          respond to a security incident or misuse, meet a legal obligation, or end service under
          the applicable agreement. Any notice, export, return or deletion obligations in that
          agreement continue to apply. Ending account access does not automatically erase workspace
          records, audit history or backups.
        </p>
      </section>
      <section>
        <h2>9. Responsibility and applicable rights</h2>
        <p>
          Any agreed warranties, service remedies and limits on liability are governed by the
          applicable written agreement and law. Nothing in these terms removes mandatory legal
          protections or excuses liability that cannot lawfully be limited. These terms do not
          specify a new financial liability cap or override an agreed governing law or dispute
          process.
        </p>
      </section>
      <section>
        <h2>10. Changes and contact</h2>
        <p>
          Updated terms will carry a revised date. Material changes will be communicated through the
          service or your organisation where appropriate. Questions about these terms should be
          directed to DigiSol at <a href="mailto:info@digisol.ae">info@digisol.ae</a>.
        </p>
      </section>
    </LegalPage>
  );
}
