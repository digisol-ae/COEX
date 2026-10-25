import type { QueryFilter } from 'mongoose';
import type { Ticket } from '@coex/shared/tickets/models/ticket.model';
import { getContext } from '@/lib/tenant-context';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import { ticketSearchTerms, literalPattern, phonePattern } from '../search-terms';

/** Related-record searches are tenant scoped; the caller retains its ticket visibility filter. */
export async function ticketSearchClauses(
  input: string,
  publicOnly = false,
): Promise<QueryFilter<Ticket>[]> {
  const { tenantId } = getContext();
  return Promise.all(
    ticketSearchTerms(input).map(async (term) => {
      const text = literalPattern(term),
        phone = phonePattern(term);
      const [customerIds, contactIds, messageTicketIds] = await Promise.all([
        publicOnly
          ? Promise.resolve([])
          : OrganisationModel.distinct('_id', {
              tenantId,
              deletedAt: null,
              $or: [{ name: text }, { email: text }, { phone: phone ?? text }],
            }),
        publicOnly
          ? Promise.resolve([])
          : ContactModel.distinct('_id', {
              tenantId,
              deletedAt: null,
              $or: [
                { name: text },
                { email: text },
                { mobile: phone ?? text },
                { phone: phone ?? text },
              ],
            }),
        TicketMessageModel.distinct('ticketId', {
          tenantId,
          ...(publicOnly ? { visibility: 'public', channel: { $ne: 'system' } } : {}),
          $or: [{ body: text }, { 'attachments.fileName': text }],
        }),
      ]);
      if (publicOnly)
        return {
          $or: [
            { number: text },
            { subject: text },
            ...(messageTicketIds.length ? [{ _id: { $in: messageTicketIds.map(String) } }] : []),
          ],
        };
      return {
        $or: [
          { number: text },
          { subject: text },
          { requesterName: text },
          { requesterEmail: text },
          { requesterPhone: phone ?? text },
          { ccEmails: text },
          { tags: text },
          ...(customerIds.length ? [{ organisationId: { $in: customerIds.map(String) } }] : []),
          ...(contactIds.length ? [{ contactId: { $in: contactIds.map(String) } }] : []),
          ...(messageTicketIds.length ? [{ _id: { $in: messageTicketIds.map(String) } }] : []),
        ],
      };
    }),
  );
}
