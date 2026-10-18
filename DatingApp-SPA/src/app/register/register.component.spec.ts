import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../_services/auth.service';
import { AlertifyService } from '../_services/alertify.service';
import { fakeAlertify } from '../_testing/test-helpers';

describe('RegisterComponent', () => {
  let auth: { register: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  const valid = {
    gender: 'female', username: 'tester', knownAs: 'Tess', dateOfBirth: new Date(1990, 0, 15),
    city: 'Boston', country: 'USA', password: 'password', confirmPassword: 'password'
  };

  beforeEach(() => {
    auth = { register: vi.fn(() => of({})), login: vi.fn(() => of(undefined)) };
    alertify = fakeAlertify();
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      declarations: [RegisterComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AlertifyService, useValue: alertify },
        { provide: Router, useValue: router }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('starts with an empty form, male selected, and the red date picker theme', () => {
    const component = create();

    expect(component.registerForm.value.gender).toBe('male');
    expect(component.registerForm.valid).toBe(false);
    expect(component.bsConfig).toEqual({ containerClass: 'theme-red' });
  });

  it('requires a 4 to 8 character password that matches the confirmation', () => {
    const form = create().registerForm;
    form.setValue({ ...valid, password: 'abc', confirmPassword: 'abc' });
    expect(form.get('password').hasError('minlength')).toBe(true);

    form.patchValue({ password: '123456789', confirmPassword: '123456789' });
    expect(form.get('password').hasError('maxlength')).toBe(true);

    form.patchValue({ password: 'password', confirmPassword: 'different' });
    expect(form.hasError('mismatch')).toBe(true);

    form.patchValue({ confirmPassword: 'password' });
    expect(form.valid).toBe(true);
  });

  it('registers, then logs in and goes to the matches page', () => {
    const component = create();
    component.registerForm.setValue(valid);

    component.register();

    expect(auth.register).toHaveBeenCalledWith(valid);
    expect(alertify.success).toHaveBeenCalledWith('Registrtation successful');
    expect(auth.login).toHaveBeenCalledWith(valid);
    expect(router.navigate).toHaveBeenCalledWith(['/members']);
  });

  it('shows the error when registration fails', () => {
    auth.register.mockReturnValue(throwError(() => 'Username already exists'));
    const component = create();
    component.registerForm.setValue(valid);

    component.register();

    expect(alertify.error).toHaveBeenCalledWith('Username already exists');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('does nothing while the form is invalid', () => {
    const component = create();

    component.register();

    expect(auth.register).not.toHaveBeenCalled();
  });

  it('tells the home page when registration is cancelled', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const component = create();
    const cancelled = vi.fn();
    component.cancelRegister.subscribe(cancelled);

    component.cancel();

    expect(cancelled).toHaveBeenCalledWith(false);
  });
});
