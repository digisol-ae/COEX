import { AuthShell } from '../login/auth-shell';
import { ForgotForm } from './forgot-form';

export const metadata = { title: 'Forgot password · Worktello' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      intro="Enter the email you sign in with. If it has a Worktello account, we send a link to choose a new password."
    >
      <ForgotForm />
    </AuthShell>
  );
}
