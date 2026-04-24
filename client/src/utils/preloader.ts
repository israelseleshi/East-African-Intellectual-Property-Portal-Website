const preloadedModules = new Set<string>();

export const preloadRegistry = {
  DashboardPage: () => import('@/pages/DashboardPage'),
  TrademarksPage: () => import('@/pages/TrademarksPage'),
  ClientsPage: () => import('@/pages/ClientsPage'),
  ClientDetailPage: () => import('@/pages/ClientDetailPage'),
  NewClientPage: () => import('@/pages/NewClientPage'),
  FormInspectorPage: () => import('@/pages/FormInspectorPage'),
  BillingPage: () => import('@/pages/BillingPage'),
  DeadlinesPage: () => import('@/pages/DeadlinesPage'),
  DeadlineDetailPage: () => import('@/pages/DeadlineDetailPage'),
  InvoiceDetailPage: () => import('@/pages/InvoiceDetailPage'),
  ProfilePage: () => import('@/pages/ProfilePage'),
  TrashPage: () => import('@/pages/TrashPage'),
  CaseFlowPage: () => import('@/pages/CaseFlowPage'),
  TrademarkDetailInfoPage: () => import('@/pages/TrademarkDetailInfoPage'),
};

export type PreloadRegistryKey = keyof typeof preloadRegistry;

export function preload(key: PreloadRegistryKey): void {
  if (preloadedModules.has(key)) return;
  
  const loader = preloadRegistry[key];
  if (loader) {
    preloadedModules.add(key);
    loader().catch(console.warn);
  }
}

export function preloadMultiple(keys: PreloadRegistryKey[]): void {
  keys.forEach(key => preload(key));
}

export function preloadOnHover(element: HTMLElement | null, moduleKey: PreloadRegistryKey): void {
  if (!element || typeof document === 'undefined') return;
  
  const handler = () => {
    preload(moduleKey);
    element.removeEventListener('mouseenter', handler);
    element.removeEventListener('touchstart', handler);
  };
  
  element.addEventListener('mouseenter', handler, { once: true });
  element.addEventListener('touchstart', handler, { once: true });
}
