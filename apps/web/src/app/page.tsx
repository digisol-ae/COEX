import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';

export default async function HomePage() {
  const user = await getSignedInUser();
  redirect(user ? '/dashboard' : '/login');
}
