import { AuthShell } from '../login/auth-shell';
import { EmailLoginForm } from './form';
import { CustomerWelcome } from '../login/customer-welcome';
export const metadata = { title: 'Email code sign-in · Worktello' };
export default function EmailLoginPage() {
  return (
    <AuthShell
      title="Sign in with an email code"
      intro="Access your support tickets using a one-time code sent to your registered email. No password needed."
    >
      <CustomerWelcome />
      <EmailLoginForm />
    </AuthShell>
  );
}
