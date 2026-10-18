import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NavComponent } from './nav.component';
import { AuthService } from '../_services/auth.service';
import { AlertifyService } from '../_services/alertify.service';
import { fakeAlertify } from '../_testing/test-helpers';

describe('NavComponent', () => {
  let auth: any;
  let alertify: ReturnType<typeof fakeAlertify>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    auth = {
      login: vi.fn(() => of(undefined)),
      loggedIn: vi.fn(() => false),
      currentPhotoUrl: of('photo.jpg'),
      decodedToken: { unique_name: 'ines' },
      currentUser: {}
    };
    alertify = fakeAlertify();
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      declarations: [NavComponent],
      imports: [FormsModule],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AlertifyService, useValue: alertify },
        { provide: Router, useValue: router }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(NavComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the login form when logged out', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('input[name=username]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Welcome');
  });

  it('shows the menu, user name and photo when logged in', () => {
    auth.loggedIn.mockReturnValue(true);
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Welcome Ines');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('photo.jpg');
    expect(fixture.componentInstance.loggedIn()).toBe(true);
  });

  it('logs in and goes to the matches page', () => {
    const component = create().componentInstance;
    component.model = { username: 'ines', password: 'password' };

    component.login();

    expect(auth.login).toHaveBeenCalledWith({ username: 'ines', password: 'password' });
    expect(alertify.success).toHaveBeenCalledWith('Logged in successfully');
    expect(router.navigate).toHaveBeenCalledWith(['/members']);
  });

  it('shows the error when login fails', () => {
    auth.login.mockReturnValue(throwError(() => 'Unauthorized'));
    const component = create().componentInstance;

    component.login();

    expect(alertify.error).toHaveBeenCalledWith('Unauthorized');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('logs out, clearing the stored login', () => {
    localStorage.setItem('token', 't');
    localStorage.setItem('user', '{}');
    const component = create().componentInstance;

    component.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(auth.decodedToken).toBeNull();
    expect(auth.currentUser).toBeNull();
    expect(alertify.message).toHaveBeenCalledWith('logged out');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
