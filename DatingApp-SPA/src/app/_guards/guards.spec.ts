import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { PreventUnsavedChanges } from './prevent-unsaved-changes.guard';
import { AuthService } from '../_services/auth.service';
import { AlertifyService } from '../_services/alertify.service';
import { MemberEditComponent } from '../members/member-edit/member-edit.component';
import { fakeAlertify } from '../_testing/test-helpers';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let auth: { loggedIn: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { loggedIn: vi.fn() };
    alertify = fakeAlertify();
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AlertifyService, useValue: alertify },
        { provide: Router, useValue: router }
      ]
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('lets logged-in users through', () => {
    auth.loggedIn.mockReturnValue(true);

    expect(guard.canActivate()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sends everyone else home with a warning', () => {
    auth.loggedIn.mockReturnValue(false);

    expect(guard.canActivate()).toBe(false);
    expect(alertify.error).toHaveBeenCalledWith('You shall not pass!!!');
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});

describe('PreventUnsavedChanges', () => {
  const guard = new PreventUnsavedChanges();
  const component = (dirty: boolean) => ({ editForm: { dirty } }) as unknown as MemberEditComponent;

  it('allows leaving when there are no changes', () => {
    expect(guard.canDeactivate(component(false))).toBe(true);
  });

  it('asks before leaving with unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    expect(guard.canDeactivate(component(true))).toBe(false);
    expect(confirm).toHaveBeenCalledWith('Are you sure you want to continue? Any unsaved changes will be lost');

    confirm.mockReturnValue(true);
    expect(guard.canDeactivate(component(true))).toBe(true);
  });
});
