import { LegalPage } from '@/components/legal-page';

export const metadata = {
  title: 'Privacy Policy | Worktello',
  description:
    'How Digisol LLC-FZ handles personal information in Worktello and its Microsoft Teams integration.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <h2>1. Scope and responsibility</h2>
        <p>
          This notice explains how Digisol LLC-FZ (DigiSol) handles personal information through
          Worktello, including its task, time, customer-management and support features, customer
          portal and Microsoft Teams integration when enabled.
        </p>
        <p>
          Your organisation decides what business information it puts into its Worktello workspace
          and who may access it. DigiSol operates the platform and processes workspace information
          to provide and support the service. Your organisation may have additional privacy notices
          and responsibilities for its employees, customers and contacts.
        </p>
      </section>
      <section>
        <h2>2. Information processed</h2>
        <p>
          Depending on the features your organisation uses, Worktello processes account names, email
          addresses, roles, permissions, organisation identifiers and sign-in records; business
          contact details; tasks, assignments, updates and time entries; support requests, messages
          and uploaded files; and customer or service records entered by authorised users.
        </p>
        <p>
          Operational and security records may include IP addresses, browser or device information,
          access events and audit history. Password accounts use password hashes rather than
          plain-text passwords. Microsoft sign-in uses identity information including the Microsoft
          Entra object identifier to link an existing Worktello account.
        </p>
      </section>
      <section>
        <h2>3. Microsoft Teams integration</h2>
        <p>
          When you choose Create Worktello task on a Teams message, Microsoft sends the selected
          message content and link, your Microsoft identity and tenant identifiers, and the context
          needed to process that action. Worktello uses your linked staff account to check
          permissions and show a task form. Creating a task saves the submitted task details and the
          original Teams message link in your organisation’s Worktello workspace.
        </p>
        <p>
          This integration does not request Microsoft Graph access to browse your chat history or
          copy the selected message’s attachments. The submitted task is subject to Worktello
          workspace permissions, which may differ from the audience of the original Teams
          conversation. Only copy information that is appropriate for the selected Space or Folder.
        </p>
        <p>
          Short-lived signed form data is used to verify the request. Submission identifiers, actor
          and tenant identifiers, creation timestamps and resulting task identifiers are retained to
          prevent duplicate creation and help investigate interrupted requests. Teams task creation
          does not automatically post a confirmation to the conversation; existing Worktello
          assignment notifications may still apply.
        </p>
      </section>
      <section>
        <h2>4. Why information is used</h2>
        <p>
          Information is used to authenticate users, enforce workspace access, manage work and
          customer support, deliver configured notifications, keep audit records, prevent abuse,
          investigate faults and maintain the service. DigiSol does not sell workspace personal
          information or use it for advertising.
        </p>
      </section>
      <section>
        <h2>5. Access and service providers</h2>
        <p>
          Information is available to authorised users according to their tenant, role, assignment
          and Space or Folder access. Designated administrators and authorised DigiSol support
          personnel may access information where necessary to administer, secure or support the
          service. Customer portal access is restricted to the contact’s own support tickets;
          internal staff notes are not shown in that portal.
        </p>
        <p>
          Hosting, database, email and identity providers process information needed to deliver
          their respective services. Microsoft processes Teams and Microsoft sign-in information
          under its own terms and privacy notice. Configured email notifications can disclose
          relevant task or ticket information to their recipients. Information may also be disclosed
          where required by applicable law or to investigate misuse and protect the service.
        </p>
      </section>
      <section>
        <h2>6. Storage, location and protection</h2>
        <p>
          Worktello uses an application server, a MongoDB database and file storage; operational
          backups may contain copies of workspace information. Depending on the service providers
          and deployment, information may be processed outside your country. Selecting a location or
          Global data residency for an Azure Bot registration does not by itself define the location
          of all Worktello or Microsoft 365 information.
        </p>
        <p>
          Controls include authenticated access, tenant-scoped data access, role and resource
          permissions, protected file downloads, HTTPS on the public service, password hashing and
          audit records. The Teams endpoint verifies Microsoft-signed requests and checks the linked
          Worktello account before creating tasks. No system can guarantee absolute security.
        </p>
      </section>
      <section>
        <h2>7. Retention and deletion</h2>
        <p>
          Workspace records are retained while needed for your organisation’s work, service
          operation, audit, dispute handling or applicable legal obligations. There is no single
          automatic deletion period for all Worktello data. Some removal actions archive or hide
          records rather than permanently erasing them. Removing the Teams app does not delete tasks
          already created in Worktello.
        </p>
        <p>
          Ask your workspace administrator or DigiSol to review an access, correction, export or
          deletion request. Deletion may be limited where retention is required or where the
          information belongs to another person or organisation. Copies may remain in operational
          backups until those backups are retired under the applicable backup arrangements.
          Submission receipts are retained to avoid duplicate task creation and are not
          automatically expired.
        </p>
      </section>
      <section>
        <h2>8. Cookies and browser storage</h2>
        <p>
          Worktello uses session and sign-in security cookies and browser storage for functionality
          such as remembering interface preferences. Choosing Remember me extends the sign-in
          session on that browser. You can sign out or clear browser data; disabling required
          cookies can prevent sign-in and other features from working.
        </p>
      </section>
      <section>
        <h2>9. Requests, questions and updates</h2>
        <p>
          For privacy questions or requests, contact your organisation’s Worktello administrator or
          DigiSol at <a href="mailto:info@digisol.ae">info@digisol.ae</a>. Include enough
          information to identify your workspace and request; do not email passwords or unnecessary
          sensitive information. Identity or authority may need to be verified before information is
          disclosed or changed. Rights and available remedies depend on applicable law.
        </p>
        <p>
          Material changes to this notice will be reflected in the updated date and communicated
          through the service or your organisation where appropriate.
        </p>
      </section>
    </LegalPage>
  );
}
