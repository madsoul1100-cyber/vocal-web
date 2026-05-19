export const tenantPublic = {
  appName: import.meta.env.VITE_APP_NAME || 'My Leader',
  tagline: import.meta.env.VITE_APP_TAGLINE || 'Your Voice, Straight to Your Leader',
  citizenBotUsername: import.meta.env.VITE_CITIZEN_BOT_USERNAME || 'Bevocal_bot',
  brand: {
    primary: import.meta.env.VITE_BRAND_PRIMARY || '#3b82f6',
    accent: import.meta.env.VITE_BRAND_ACCENT || '#CC0000',
  },
} as const
