import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { DemoOidcSecurityService } from './core/demo-oidc-security.service';
import { demoApiInterceptor } from './core/demo-api.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([demoApiInterceptor])),
    provideRouter(routes),
    { provide: OidcSecurityService, useClass: DemoOidcSecurityService },
  ]
};
