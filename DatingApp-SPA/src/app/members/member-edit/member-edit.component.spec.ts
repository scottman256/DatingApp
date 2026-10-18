import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MemberEditComponent } from './member-edit.component';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { UserService } from 'src/app/_services/user.service';
import { AuthService } from 'src/app/_services/auth.service';
import { aUser, fakeAlertify } from 'src/app/_testing/test-helpers';

describe('MemberEditComponent', () => {
  let users: { updateUser: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    users = { updateUser: vi.fn(() => of({})) };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MemberEditComponent],
      imports: [FormsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ user: aUser({ city: 'Northridge' }) }) } },
        { provide: AuthService, useValue: { decodedToken: { nameid: '1' }, currentPhotoUrl: of('me.jpg') } },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  async function create() {
    const fixture = TestBed.createComponent(MemberEditComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the profile and current photo', async () => {
    const fixture = await create();

    expect(fixture.componentInstance.user.city).toBe('Northridge');
    expect(fixture.componentInstance.photoUrl).toBe('me.jpg');
    expect(fixture.nativeElement.querySelector('.card-img-top').getAttribute('src')).toBe('me.jpg');
    expect(fixture.nativeElement.querySelector('.alert-info')).toBeNull();
  });

  it('warns about unsaved changes once the form is edited', async () => {
    const fixture = await create();

    fixture.componentInstance.editForm.form.markAsDirty();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.alert-info').textContent).toContain('You have made changes');
  });

  it('saves the profile and resets the form', async () => {
    const fixture = await create();
    const component = fixture.componentInstance;
    component.editForm.form.markAsDirty();

    component.updateUser();

    expect(users.updateUser).toHaveBeenCalledWith('1', component.user);
    expect(alertify.success).toHaveBeenCalledWith('Profile updated successfully');
    expect(component.editForm.dirty).toBe(false);
  });

  it('shows the error when saving fails', async () => {
    users.updateUser.mockReturnValue(throwError(() => 'Server Error'));
    const component = (await create()).componentInstance;

    component.updateUser();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });

  it('shows the new main photo', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const component = (await create()).componentInstance;

    component.updateMainPhoto('new.jpg');

    expect(component.user.photoUrl).toBe('new.jpg');
  });

  it('asks the browser to confirm leaving only with unsaved changes', async () => {
    const component = (await create()).componentInstance;
    const clean: any = {};
    const dirty: any = {};

    component.unloadNotification(clean);
    component.editForm.form.markAsDirty();
    component.unloadNotification(dirty);

    expect(clean.returnValue).toBeUndefined();
    expect(dirty.returnValue).toBe(true);
  });
});
