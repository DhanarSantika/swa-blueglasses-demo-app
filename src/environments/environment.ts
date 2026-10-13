declare global {
  interface Window {
    __SIKAP_RUNTIME__?: {
    identityAuthority?: string;
    apiAuthority?: string;
    };
  }
}

export const environment = {
  identityAuthority: '/demo-api',
  apiAuthority: '/demo-api',
};
