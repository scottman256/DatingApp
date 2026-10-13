import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ListsComponent } from './lists.component';
import { AuthService } from '../_services/auth.service';
import { UserService } from '../_services/user.service';
import { AlertifyService } from '../_services/alertify.service';
import { aUser, fakeAlertify } from '../_testing/test-helpers';

describe('ListsComponent', () => {
  const pagination = { currentPage: 1, itemsPerPage: 5, totalItems: 1, totalPages: 1 };
  let users: { getUsers: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    users = { getUsers: vi.fn(() => of({ result: [aUser({ knownAs: 'Ryan' })], pagination })) };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [ListsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ users: { result: [aUser()], pagination } }) } },
        { provide: AuthService, useValue: {} },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ListsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the members who like me from the resolver', () => {
    const fixture = create();

    expect(fixture.componentInstance.likesParam).toBe('Likers');
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Members who like me : 1');
    expect(fixture.nativeElement.querySelectorAll('app-member-card').length).toBe(1);
  });

  it('switches between members I like and members who like me', () => {
    const fixture = create();
    const component = fixture.componentInstance;

    component.Ilike();
    fixture.detectChanges();
    expect(users.getUsers).toHaveBeenLastCalledWith(1, 5, null, 'Likees');
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe("Members who I've Liked : 1");

    component.likesMe();
    expect(users.getUsers).toHaveBeenLastCalledWith(1, 5, null, 'Likers');
  });

  it('loads the selected page', () => {
    const component = create().componentInstance;

    component.pageChanged({ page: 2 });

    expect(users.getUsers).toHaveBeenCalledWith(2, 5, null, 'Likers');
  });

  it('shows the error when loading fails', () => {
    users.getUsers.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.Ilike();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });
});
