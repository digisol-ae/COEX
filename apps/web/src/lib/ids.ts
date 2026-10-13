import { Types } from 'mongoose';

/**
 * Identifiers cross a boundary twice: they leave the database as ObjectIds, reach a form as
 * strings, and come back as strings. These two helpers are the only place that conversion happens,
 * so an invalid identifier fails here rather than deep inside a query.
 */

export function toObjectId(value: string | Types.ObjectId): Types.ObjectId {
  if (typeof value !== 'string') return value;

  if (!Types.ObjectId.isValid(value)) {
    throw new Error('That record identifier is not valid.');
  }

  return new Types.ObjectId(value);
}

export function toOptionalObjectId(
  value: string | Types.ObjectId | null | undefined,
): Types.ObjectId | null {
  if (!value) return null;
  return toObjectId(value);
}
