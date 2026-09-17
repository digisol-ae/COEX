import type { Model, QueryFilter, Types, UpdateQuery } from 'mongoose';
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
  type Filter = QueryFilter<T>;
  type CreateInput = Parameters<Model<T>['create']>[0];

  function scope(filter: Filter = {}, options: QueryOptions = {}): Filter {
    const { tenantId } = getContext();

    const scoped: Record<string, unknown> = { ...filter, tenantId };

    if (!options.withDeleted) {
      scoped.deletedAt = null;
    }

    return scoped as Filter;
  }

  return {
    /** The scoped filter, for the rare query that needs aggregation rather than these helpers. */
    scope,

    findOne(filter: Filter = {}, options: QueryOptions = {}) {
      return model.findOne(scope(filter, options));
    },

    findById(id: Types.ObjectId | string, options: QueryOptions = {}) {
      return model.findOne(scope({ _id: id } as Filter, options));
    },

    find(filter: Filter = {}, options: QueryOptions = {}) {
      return model.find(scope(filter, options));
    },

    count(filter: Filter = {}, options: QueryOptions = {}) {
      return model.countDocuments(scope(filter, options));
    },

    create(document: Omit<Partial<T>, 'tenantId'>) {
      const { tenantId } = getContext();

      // The tenant always comes from the session, never from the caller, which is why the input
      // type excludes it and the cast is confined to this one line.
      return model.create({ ...document, tenantId } as CreateInput);
    },

    updateOne(filter: Filter, update: UpdateQuery<T>, options: QueryOptions = {}) {
      return model.findOneAndUpdate(scope(filter, options), update, { new: true });
    },

    /** Soft delete. Records never leave the database, so history and audit stay intact. */
    softDelete(filter: Filter) {
      return model.findOneAndUpdate(
        scope(filter),
        { $set: { deletedAt: new Date() } },
        { new: true },
      );
    },
  };
}
