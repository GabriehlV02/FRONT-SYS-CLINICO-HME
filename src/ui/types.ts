import type { ReactNode } from 'react';
import type { IconName } from './components/Icon';

export type AuthSession = {
  user: string;
  role?: string;
  permissions: string[];
};

export type SystemConfig = {
  id: 'clinico' | 'contable' | 'portal';
  name: string;
  subtitle: string;
  loginTitle: string;
  role: string;
  tagline: string;
  category: string;
  dashboardTitle: string;
  welcomeTitle: string;
  welcomeDescription: string;
  actionId: string;
  actionLabel: string;
  quickIds: string[];
  metrics: { title: string; icon: IconName; value: string; note: string }[];
  modules: { id: string; name: string; icon: IconName; group: string; description: string }[];
  sidebarGroups?: string[];
  renderModule?: (id: string, select: (id: string) => void, activeId?: string, session?: AuthSession) => ReactNode;
};
