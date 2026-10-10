import type { AnyRoute } from '../http/route';
import { leadRoutes } from './leads';
import { systemRoutes } from './system';

/** Every route the API serves. A module's routes are added here as the module moves over. */
export const routes: AnyRoute[] = [...systemRoutes, ...leadRoutes];
