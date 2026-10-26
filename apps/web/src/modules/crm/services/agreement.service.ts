import { Types } from 'mongoose';
import { AgreementTemplateModel } from '@coex/shared/crm/models/agreement-template.model';
import { AgreementDraftModel } from '@coex/shared/crm/models/agreement-draft.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { DEFAULT_AGREEMENT_TEMPLATES } from '@coex/shared/crm/agreement-defaults';
import {
  populateAgreement,
  validateAgreement,
  assertAgreementComplete,
  type AgreementTemplate,
} from '@coex/shared/crm/contract-drafting';
import { billingSchedule } from '@coex/shared/crm/contract-status';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { recordAudit } from '@/modules/core/services/audit.service';
import { getContract } from './contract.service';
import { listProducts } from './product.service';

const templates = () => repository(AgreementTemplateModel);
const drafts = () => repository(AgreementDraftModel);
export async function listAgreementTemplates(): Promise<AgreementTemplate[]> {
  await connectToDatabase();
  const custom = await templates().find().sort({ name: 1 });
  return [
    ...DEFAULT_AGREEMENT_TEMPLATES,
    ...custom.map((t) => ({
      id: String(t._id),
      name: t.name,
      type: t.type as AgreementTemplate['type'],
      body: t.body,
      reviewNotes: t.reviewNotes,
      revision: t.revision,
      builtin: false,
    })),
  ];
}
export async function saveAgreementTemplate(input: {
  id?: string;
  name: string;
  type: string;
  body: string;
  reviewNotes: string;
  revision: number;
}) {
  await connectToDatabase();
  validateAgreement(input.body);
  if (!input.name.trim() || input.name.length > 200)
    throw new Error('Enter a template name of at most 200 characters.');
  if (!['amc', 'subscription', 'project'].includes(input.type))
    throw new Error('Choose a contract type.');
  if (input.reviewNotes.length > 10000) throw new Error('Review notes are too long.');
  const fields = {
    name: input.name.trim(),
    type: input.type as AgreementTemplate['type'],
    body: input.body,
    reviewNotes: input.reviewNotes.trim(),
  };
  const saved = input.id
    ? await templates().updateOne(
        { _id: input.id, revision: input.revision },
        { $set: fields, $inc: { revision: 1 } },
      )
    : await templates().create(fields);
  if (!saved) throw new Error('This template changed. Reload before saving.');
  await recordAudit({
    action: 'agreement_template.saved',
    entityType: 'AgreementTemplate',
    entityId: saved._id,
    after: { name: saved.name, revision: saved.revision },
  });
  return String(saved._id);
}
export async function archiveAgreementTemplate(id: string) {
  await connectToDatabase();
  const saved = await templates().softDelete({ _id: id });
  if (!saved) throw new Error('Template not found.');
  await recordAudit({
    action: 'agreement_template.archived',
    entityType: 'AgreementTemplate',
    entityId: saved._id,
  });
}
export async function agreementValues(id: string): Promise<Record<string, string>> {
  const contract = await getContract(id);
  if (!contract) throw new Error('Contract not found.');
  const [customer, tenant, products] = await Promise.all([
    repository(OrganisationModel).findById(contract.organisationId),
    TenantModel.findById(getContext().tenantId).select('name'),
    listProducts(true),
  ]);
  const names = new Map(products.map((p) => [p.id, p.name]));
  const amount = (minor: number) => `${contract.currency} ${(minor / 100).toFixed(2)}`;
  return {
    contract_title: contract.title,
    contract_number: contract.number,
    customer_name: contract.organisationName,
    customer_address: customer?.address ?? '',
    provider_name: tenant?.name ?? '',
    start_date: contract.startDate,
    end_date: contract.endDate,
    agreement_date: contract.startDate,
    amount: amount(contract.valueMinorUnits),
    billing_cycle: {
      monthly: 'Monthly',
      bimonthly: 'Every two months',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
    }[contract.billingFrequency],
    term_amount: amount(
      contract.valueMinorUnits *
        billingSchedule(contract.startDate, contract.endDate, contract.billingFrequency).length,
    ),
    setup_fee: amount(contract.setupFeeMinorUnits ?? 0),
    training_fee: amount(contract.trainingFeeMinorUnits ?? 0),
    hardware_terms: contract.hardwareTerms ?? '',
    covered_products: contract.productIds.map((p) => names.get(p) ?? 'Archived product').join(', '),
    service_lines: (contract.serviceLines ?? [])
      .map(
        (l) =>
          `${names.get(l.productId) ?? 'Archived product'}: ${l.description || 'Service'} | Quantity ${l.quantity} | Unit rate ${amount(l.unitPriceMinorUnits)} | Per billing period ${amount(l.quantity * l.unitPriceMinorUnits)}`,
      )
      .join('\n'),
  };
}
export interface DraftSummary {
  id: string;
  templateId: string;
  templateName: string;
  templateRevision: number;
  body: string;
  reviewNotes: string;
  reviewed: boolean;
  revision: number;
}
export async function getAgreementDraft(contractId: string): Promise<DraftSummary | null> {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(contractId) || !(await getContract(contractId))) return null;
  const d = await drafts().findOne({ contractId });
  return d
    ? {
        id: String(d._id),
        templateId: d.templateId,
        templateName: d.templateName,
        templateRevision: d.templateRevision,
        body: d.body,
        reviewNotes: d.reviewNotes,
        reviewed: d.reviewed,
        revision: d.revision,
      }
    : null;
}
export async function generateAgreementDraft(
  contractId: string,
  templateId: string,
  values: Record<string, string>,
  expectedRevision: number,
) {
  const contract = await getContract(contractId);
  if (!contract) throw new Error('Contract not found.');
  const template = (await listAgreementTemplates()).find((t) => t.id === templateId);
  if (!template) throw new Error('Template not found.');
  if (template.type !== contract.type)
    throw new Error('Choose a template matching the contract type.');
  if (template.id === 'builtin:r4-subscription' && contract.billingFrequency !== 'yearly')
    throw new Error(
      'The R4 starter requires annual billing. Change the contract billing cycle or use a custom template with the agreed payment terms.',
    );
  if (
    Object.keys(values).length > 100 ||
    Object.values(values).some((v) => typeof v !== 'string' || v.length > 20000)
  )
    throw new Error('Invalid placeholder values.');
  const body = populateAgreement(template.body, {
    ...(await agreementValues(contractId)),
    ...values,
  });
  validateAgreement(body);
  const fields = {
    templateId,
    templateName: template.name,
    templateRevision: template.revision,
    reviewNotes: template.reviewNotes,
    body,
    reviewed: false,
  };
  const saved =
    expectedRevision === 0
      ? await drafts().create({ ...fields, contractId: new Types.ObjectId(contractId) })
      : await drafts().updateOne(
          { contractId, revision: expectedRevision },
          { $set: fields, $inc: { revision: 1 } },
        );
  if (!saved) throw new Error('The draft changed. Reload before replacing it.');
  await recordAudit({
    action: 'agreement_draft.generated',
    entityType: 'Contract',
    entityId: new Types.ObjectId(contractId),
    after: { templateId, templateRevision: template.revision, revision: saved.revision },
  });
}
export async function saveAgreementDraft(
  contractId: string,
  body: string,
  reviewed: boolean,
  revision: number,
) {
  if (!(await getContract(contractId))) throw new Error('Contract not found.');
  validateAgreement(body);
  if (reviewed) assertAgreementComplete(body);
  const saved = await drafts().updateOne(
    { contractId, revision },
    { $set: { body, reviewed }, $inc: { revision: 1 } },
  );
  if (!saved) throw new Error('The draft changed. Reload before saving.');
  await recordAudit({
    action: reviewed ? 'agreement_draft.reviewed' : 'agreement_draft.saved',
    entityType: 'Contract',
    entityId: new Types.ObjectId(contractId),
    after: { revision: saved.revision },
  });
}
