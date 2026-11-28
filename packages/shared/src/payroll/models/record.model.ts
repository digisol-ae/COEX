import { Schema, model, models, type Model } from 'mongoose';
import type { Types } from 'mongoose';

/** Separate collections share an envelope. Services validate each payload with its payroll schema.
 * Monetary payload keys end in MinorUnits; engine major-unit objects never go directly to Mongo. */
export interface PayrollDocument {
  _id?: Types.ObjectId;
  tenantId: Types.ObjectId;
  deletedAt: Date | null;
  key: string;
  employeeId: string | null;
  userId: string | null;
  status: string;
  period: string | null;
  currency: string | null;
  version: number;
  mutexRevision: number;
  data: Record<string, unknown>;
}
export const RECORD_KINDS = [
  'settings',
  'employee',
  'structure',
  'assignment',
  'leaveType',
  'leave',
  'loan',
  'reimbursement',
  'category',
  'run',
  'commissionPlan',
  'accrual',
  'payment',
  'attachment',
  'change',
  'recurringItem',
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];
export const PAYROLL_MODELS = Object.fromEntries(
  RECORD_KINDS.map((kind) => {
    const schema = new Schema<PayrollDocument>(
      {
        tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
        deletedAt: { type: Date, default: null },
        key: { type: String, required: true },
        employeeId: { type: String, default: null, index: true },
        userId: { type: String, default: null },
        status: { type: String, required: true },
        period: { type: String, default: null },
        currency: { type: String, default: null },
        version: { type: Number, default: 0 },
        mutexRevision: { type: Number, default: 0 },
        data: { type: Schema.Types.Mixed, required: true },
      },
      { timestamps: true },
    );
    schema.index({ tenantId: 1, key: 1 }, { unique: true });
    if (kind === 'employee')
      schema.index(
        { tenantId: 1, userId: 1 },
        { unique: true, partialFilterExpression: { userId: { $type: 'string' } } },
      );
    if (kind === 'assignment')
      schema.index({ tenantId: 1, employeeId: 1, 'data.effectiveFrom': 1 }, { unique: true });
    const name = `Payroll_${kind}`;
    return [
      kind,
      (models[name] as Model<PayrollDocument> | undefined) ?? model<PayrollDocument>(name, schema),
    ];
  }),
) as Record<RecordKind, Model<PayrollDocument>>;
