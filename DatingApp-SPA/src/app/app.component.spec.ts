import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AuthService } from './_services/auth.service';
import { tokenGetter } from './app.module';
import { aUser, fakeToken } from './_testing/test-helpers';

describe('AppComponent', () => {
  let auth: { decodedToken: any; currentUser: any; changeMemberPhoto: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    auth = { decodedToken: undefined, currentUser: undefined, changeMemberPhoto: vi.fn() };
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('renders the nav bar and the routed page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.title).toBe('app');
    expect(fixture.nativeElement.querySelector('app-nav')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('restores the logged-in user from local storage', () => {
    const user = aUser({ photoUrl: 'me.jpg' });
    localStorage.setItem('token', fakeToken({ unique_name: 'ines' }));
    localStorage.setItem('user', JSON.stringify(user));

    TestBed.createComponent(AppComponent).detectChanges();

    expect(auth.decodedToken.unique_name).toBe('ines');
    expect(auth.currentUser.knownAs).toBe('Ines');
    expect(auth.changeMemberPhoto).toHaveBeenCalledWith('me.jpg');
  });

  it('leaves the user logged out when nothing is stored', () => {
    TestBed.createComponent(AppComponent).detectChanges();

    expect(auth.decodedToken).toBeUndefined();
    expect(auth.changeMemberPhoto).not.toHaveBeenCalled();
  });

  it('reads the token for API requests from local storage', () => {
    localStorage.setItem('token', 'abc');

    expect(tokenGetter()).toBe('abc');
  });
});
