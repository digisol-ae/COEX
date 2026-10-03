import { z } from 'zod';

export function normaliseCc(addresses: readonly string[], to?: string | null): string[] {
  const primary = to?.trim().toLowerCase();
  const unique = new Set<string>();
  for (const address of addresses) {
    const email = address.trim().toLowerCase();
    if (!z.email().safeParse(email).success)
      throw new Error(`Invalid CC email address: ${address}`);
    if (email !== primary) unique.add(email);
  }
  return [...unique];
}

export const quickCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Enter the customer name.').max(200),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid customer email address.')),
});

export interface CollaboratorOption {
  name: string;
  email: string;
  source: string;
}
