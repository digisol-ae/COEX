import { asUser, requireUser } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { orderGroups, visibleGroups } from '@/components/navigation/navigation';
import { getNavigationOrder } from '@/modules/core/services/user.service';
import { MenuOrderForm } from './menu-order-form';

export const metadata = { title: 'Arrange my menu · COEX' };

/** Each person puts the part of COEX they live in at the top, for themselves only. */
export default async function MenuOrderPage() {
  const user = await requireUser();
  const order = await asUser(user, () => getNavigationOrder());
  const standard = visibleGroups(user.permissions);
  const groups = orderGroups(standard, order);
  const simple = (list: typeof standard) =>
    list.map((group) => ({ id: group.id, label: group.label }));

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Arrange my menu"
        description="Move the parts of COEX you use most to the top. This changes your menu only, on every device you sign in on."
      />
      <MenuOrderForm groups={simple(groups)} standard={simple(standard)} />
    </div>
  );
}
