/** One source for the header's section label and API result scope. */
export const SEARCH_SCOPES = [
  'all',
  'tasks',
  'spaces',
  'tickets',
  'customers',
  'products',
  'contracts',
  'leads',
  'opportunities',
] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export function searchContext(
  pathname: string,
): { scope: SearchScope; label: string; hint: string } | null {
  const section = pathname.split('/').filter(Boolean)[0];
  if (section === 'support')
    return {
      scope: 'tickets',
      label: 'Search tickets',
      hint: 'Number, subject, description, replies, customer, contact, email or phone',
    };
  if (section === 'tasks' || section === 'personal' || section === 'my-desk' || section === 'time')
    return { scope: 'tasks', label: 'Search tasks', hint: 'Task title or number' };
  if (section === 'spaces') return { scope: 'spaces', label: 'Search spaces', hint: 'Space name' };
  if (section === 'customers')
    return { scope: 'customers', label: 'Search customers', hint: 'Customer name' };
  if (section === 'products')
    return {
      scope: 'products',
      label: 'Search products',
      hint: 'Product name, code or description',
    };
  if (section === 'contracts')
    return {
      scope: 'contracts',
      label: 'Search contracts',
      hint: 'Contract title, number or customer',
    };
  if (section === 'leads')
    return { scope: 'leads', label: 'Search leads', hint: 'Lead name, company, email or number' };
  if (section === 'opportunities')
    return {
      scope: 'opportunities',
      label: 'Search opportunities',
      hint: 'Opportunity title or number',
    };
  if (!section || section === 'dashboard')
    return {
      scope: 'all',
      label: 'Search all sections',
      hint: 'Tasks, spaces, tickets and customers',
    };
  return null;
}
