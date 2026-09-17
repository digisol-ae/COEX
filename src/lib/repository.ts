import type { FilterQuery, Model, UpdateQuery, Types } from 'mongoose';
import { getContext } from './tenant-context';

/**
 * Tenant scoped access to a collection.
 *
 * Nothing in the application talks to a Mongoose model directly. Every read and write goes through
 * this wrapper, which takes tenantId from the request context and merges it into the filter, and
 * stamps it onto inserts. Forgetting a tenantId therefore becomes impossible rather than merely
 * discouraged, which is the single most important rule in a multi tenant system.
 *
 * Soft delete is applied here too: deleted documents are excluded unless withDeleted is asked for.
 */

interface TenantScopedDocument {
  tenantId: Types.ObjectId;
  deletedAt?: Date | null;
}

export interface QueryOptions {
  withDeleted?: boolean;
}

export function repository<T extends TenantScopedDocument>(model: Model<T>) {
  function scope(filter: FilterQuery<T> = {}, options: QueryOptions = {}): FilterQuery<T> {
    const { tenantId } = getContext();

    const scoped: Record<string, unknown> = { ...filter, tenantId };

    if (!options.withDeleted) {
      scoped.deletedAt = null;
    }

    return scoped as FilterQuery<T>;
  }

  return {
    /** The scoped filter, for the rare query that needs aggregation rather than these helpers. */
    scope,

    findOne(filter: FilterQuery<T> = {}, options: QueryOptions = {}) {
      return model.findOne(scope(filter, options));
    },

    findById(id: Types.ObjectId | string, options: QueryOptions = {}) {
      return model.findOne(scope({ _id: id } as FilterQuery<T>, options));
    },

    find(filter: FilterQuery<T> = {}, options: QueryOptions = {}) {
      return model.find(scope(filter, options));
    },

    count(filter: FilterQuery<T> = {}, options: QueryOptions = {}) {
      return model.countDocuments(scope(filter, options));
    },

    create(document: Omit<Partial<T>, 'tenantId'>) {
      const { tenantId } = getContext();
      return model.create({ ...document, tenantId });
    },

    updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options: QueryOptions = {}) {
      return model.findOneAndUpdate(scope(filter, options), update, { new: true });
    },

    /** Soft delete. Records never leave the database, so history and audit stay intact. */
    softDelete(filter: FilterQuery<T>) {
      return model.findOneAndUpdate(
        scope(filter),
        { $set: { deletedAt: new Date() } } as UpdateQuery<T>,
        { new: true },
      );
    },
  };
}
