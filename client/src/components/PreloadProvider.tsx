import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { preloadMultiple, PreloadRegistryKey } from '@/utils/preloader';

type PreloadMap = Record<string, PreloadRegistryKey[]>;

const preloadMap: PreloadMap = {
  '/': ['TrademarksPage'],
  '/dashboard': ['TrademarksPage'],
  '/trademarks': ['TrademarkDetailInfoPage'],
  '/clients': ['ClientDetailPage'],
  '/clients/new': ['NewClientPage'],
  '/eipa-forms/application-form': [],
  '/eipa-forms/renewal-form': [],
  '/billing': [],
  '/deadlines': ['DeadlineDetailPage'],
  '/profile': ['ProfilePage'],
  '/trash': ['TrashPage'],
};

export function PreloadProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  const getModulesToPreload = useCallback((): PreloadRegistryKey[] => {
    const pathname = location.pathname;
    
    if (preloadMap[pathname]) {
      return preloadMap[pathname];
    }
    
    const baseRoute = '/' + pathname.split('/')[1];
    if (preloadMap[baseRoute]) {
      return preloadMap[baseRoute];
    }
    
    const subRoutes: Record<string, PreloadRegistryKey[]> = {
      '/clients/': ['ClientDetailPage'],
      '/deadlines/': ['DeadlineDetailPage'],
      '/invoices/': ['InvoiceDetailPage'],
      '/trademarks/': ['TrademarkDetailInfoPage'],
      '/case-flow/': [],
    };
    
    for (const [prefix, modules] of Object.entries(subRoutes)) {
      if (pathname.startsWith(prefix)) {
        return modules;
      }
    }
    
    return [];
  }, [location.pathname]);
  
  useEffect(() => {
    const modulesToPreload = getModulesToPreload();
    preloadMultiple(modulesToPreload);
  }, [getModulesToPreload]);
  
  return <>{children}</>;
}
