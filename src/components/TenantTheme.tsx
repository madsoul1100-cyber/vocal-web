import { tenantBrand } from '@/config/tenant.config'

export function TenantTheme() {
  const css = `:root {
  --brand-500: ${tenantBrand.primaryColor};
  --brand-600: ${tenantBrand.primaryColorDark};
  --brand-700: ${tenantBrand.primaryColorDark};
  --tenant-accent: ${tenantBrand.accentColor};
}`
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
