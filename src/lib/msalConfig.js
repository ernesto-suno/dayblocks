import { PublicClientApplication, LogLevel } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_MSAL_CLIENT_ID
const tenantId = import.meta.env.VITE_MSAL_TENANT_ID

export const msalConfig = {
  auth: {
    clientId: clientId || '',
    authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        if (level === LogLevel.Error) console.error(message)
      },
      logLevel: LogLevel.Error,
    },
  },
}

// Scopes needed for Microsoft Graph
export const graphScopes = {
  user: ['User.Read'],
  calendar: ['Calendars.ReadWrite'],
}

export const loginRequest = {
  scopes: [...graphScopes.user, ...graphScopes.calendar],
}

export const msalInstance = new PublicClientApplication(msalConfig)
