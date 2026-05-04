const DEFAULT_API_PORT = 11451;
const GRAPHQL_PATH = '/graphql';

type MobilePlatformOS = 'ios' | 'android' | 'web' | string;

export type MobileAPIUrlInput = {
  configuredURL?: string;
  isDev: boolean;
  platformOS: MobilePlatformOS;
  hostUri?: string;
};

const withGraphQLPath = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/$/, '');
  return trimmed.endsWith(GRAPHQL_PATH) ? trimmed : `${trimmed}${GRAPHQL_PATH}`;
};

export const resolveMobileAPIUrl = ({
  configuredURL,
  isDev,
  platformOS,
  hostUri,
}: MobileAPIUrlInput) => {
  if (configuredURL) return withGraphQLPath(configuredURL);

  if (isDev) {
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (platformOS === 'android' && (ip === 'localhost' || ip === '127.0.0.1')) {
        return `http://10.0.2.2:${DEFAULT_API_PORT}${GRAPHQL_PATH}`;
      }

      return `http://${ip}:${DEFAULT_API_PORT}${GRAPHQL_PATH}`;
    }

    return platformOS === 'android'
      ? `http://10.0.2.2:${DEFAULT_API_PORT}${GRAPHQL_PATH}`
      : `http://localhost:${DEFAULT_API_PORT}${GRAPHQL_PATH}`;
  }

  throw new Error('EXPO_PUBLIC_API_URL must be configured for production mobile builds.');
};
