import { AuthShell } from '../login/auth-shell';
import { ActivationForm } from './form';
export const metadata = { title: 'Activate your account · Worktello' };
export default function ActivationPage() {
  return (
    <AuthShell
      title="First time on Worktello?"
      intro="Verify your email address, then choose a password to access your support tickets."
    >
      <ActivationForm />
    </AuthShell>
  );
}
