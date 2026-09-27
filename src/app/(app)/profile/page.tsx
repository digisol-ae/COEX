import { asUser, requireUser } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { getMyProfile } from '@/modules/core/services/user.service';
import { PasswordForm, ProfileForm } from './profile-forms';

export const metadata = { title: 'My profile · COEX' };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await asUser(user, () => getMyProfile());

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="My profile"
        description={`${profile.email} · ${user.tenantName}. Your role and access are set by an administrator.`}
      />
      <ProfileForm name={profile.name} title={profile.title ?? ''} />
      {profile.hasPassword ? <PasswordForm /> : null}
    </div>
  );
}
