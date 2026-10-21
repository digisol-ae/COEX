import type { ReactNode } from 'react';
import { SetupWorkspace } from '@/components/navigation/setup-workspace';
import { setupTabs } from './workspace-content';
export default async function SetupLayout({ children }: { children: ReactNode }) {
  return <SetupWorkspace tabs={await setupTabs()}>{children}</SetupWorkspace>;
}
