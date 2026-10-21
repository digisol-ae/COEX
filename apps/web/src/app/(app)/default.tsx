import { notFound } from 'next/navigation';
/** Missing hard-load pages must remain 404s; intercepted navigation retains its real background. */
export default function Default() {
  notFound();
}
