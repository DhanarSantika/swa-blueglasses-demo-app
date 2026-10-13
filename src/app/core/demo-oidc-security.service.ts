import { Injectable } from '@angular/core';
import { of } from 'rxjs';

const demoUser = { preferred_username: 'demo.owner', name: 'Demo Owner', role: ['OWNER'] };

@Injectable()
export class DemoOidcSecurityService {
  checkAuth() { return of({ isAuthenticated: true, userData: demoUser, accessToken: 'demo-token', errorMessage: null }); }
  getUserData() { return of(demoUser); }
  getAccessToken() { return of('demo-token'); }
  authorize(): void {}
  logoff() { return of({ isAuthenticated: false }); }
}
