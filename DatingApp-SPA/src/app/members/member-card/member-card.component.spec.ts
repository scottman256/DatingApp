import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MemberCardComponent } from './member-card.component';
import { AuthService } from '../../_services/auth.service';
import { UserService } from '../../_services/user.service';
import { AlertifyService } from '../../_services/alertify.service';
import { aUser, fakeAlertify } from '../../_testing/test-helpers';

describe('MemberCardComponent', () => {
  let users: { sendLike: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    users = { sendLike: vi.fn(() => of({})) };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MemberCardComponent],
      providers: [
        { provide: AuthService, useValue: { decodedToken: { nameid: '1' } } },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create(user = aUser({ id: 6, knownAs: 'Ryan', age: 62, city: 'Lupton', photoUrl: 'ryan.jpg' })) {
    const fixture = TestBed.createComponent(MemberCardComponent);
    fixture.componentInstance.user = user;
    fixture.detectChanges();
    return fixture;
  }

  it('shows the member', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.card-title').textContent.trim()).toBe('Ryan, 62');
    expect(fixture.nativeElement.querySelector('.card-text').textContent).toBe('Lupton');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('ryan.jpg');
  });

  it('shows the default photo when the member has none', () => {
    const fixture = create(aUser({ photoUrl: null }));

    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('../../../assets/user.png');
  });

  it('likes the member', () => {
    const fixture = create();

    fixture.nativeElement.querySelector('button .fa-heart').parentElement.click();

    expect(users.sendLike).toHaveBeenCalledWith('1', 6);
    expect(alertify.success).toHaveBeenCalledWith('You have liked: Ryan');
  });

  it('shows the error when the like fails', () => {
    users.sendLike.mockReturnValue(throwError(() => 'You already like this user'));
    const component = create().componentInstance;

    component.sendLike(6);

    expect(alertify.error).toHaveBeenCalledWith('You already like this user');
  });
});
