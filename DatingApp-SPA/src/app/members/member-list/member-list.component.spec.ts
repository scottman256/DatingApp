import { Directive, NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { MemberListComponent } from './member-list.component';
import { UserService } from '../../_services/user.service';
import { AlertifyService } from '../../_services/alertify.service';
import { aUser, fakeAlertify } from '../../_testing/test-helpers';

/**
 * The app has no value accessor for the order-by buttons either (it logs "No value accessor"
 * in the console, as it did in 2020); this stub stops TestBed rethrowing that error.
 */
@Directive({
  selector: 'button[ngModel]',
  standalone: false,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: OrderByButtonStub, multi: true }]
})
class OrderByButtonStub implements ControlValueAccessor {
  writeValue() {}
  registerOnChange() {}
  registerOnTouched() {}
}

describe('MemberListComponent', () => {
  const pagination = { currentPage: 1, itemsPerPage: 5, totalItems: 5, totalPages: 1 };
  let users: { getUsers: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.setItem('user', JSON.stringify(aUser({ gender: 'female' })));
    users = { getUsers: vi.fn(() => of({ result: [aUser({ knownAs: 'May' })], pagination: { ...pagination, totalItems: 1 } })) };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MemberListComponent, OrderByButtonStub],
      imports: [FormsModule, PaginationModule],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ users: { result: [aUser({ knownAs: 'Ryan' })], pagination } }) } },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(MemberListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the matches from the resolver, filtered to the opposite gender', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Your matches - 5 found');
    expect(fixture.componentInstance.userParams).toEqual({ gender: 'male', minAge: 18, maxAge: 99, orderBy: 'lastActive' });
    expect(fixture.nativeElement.querySelectorAll('app-member-card').length).toBe(1);
  });

  it('shows women to a man by default', () => {
    localStorage.setItem('user', JSON.stringify(aUser({ gender: 'male' })));

    expect(create().componentInstance.userParams.gender).toBe('female');
  });

  it('applies the filters', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.userParams.maxAge = 40;

    component.loadUsers();
    fixture.detectChanges();

    expect(users.getUsers).toHaveBeenCalledWith(1, 5, expect.objectContaining({ maxAge: 40 }));
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Your matches - 1 found');
  });

  it('resets the filters', () => {
    const component = create().componentInstance;
    component.userParams = { gender: 'female', minAge: 30, maxAge: 40, orderBy: 'created' };

    component.resetFilters();

    expect(component.userParams).toEqual({ gender: 'male', minAge: 18, maxAge: 99, orderBy: 'created' });
    expect(users.getUsers).toHaveBeenCalled();
  });

  it('sorts by newest members or last active', () => {
    const component = create().componentInstance;

    component.sortByCreated();
    expect(users.getUsers).toHaveBeenLastCalledWith(1, 5, expect.objectContaining({ orderBy: 'created' }));

    component.sortByLastActive();
    expect(users.getUsers).toHaveBeenLastCalledWith(1, 5, expect.objectContaining({ orderBy: 'lastActive' }));
  });

  it('loads the selected page', () => {
    const component = create().componentInstance;

    component.pageChanged({ page: 2 });

    expect(users.getUsers).toHaveBeenCalledWith(2, 5, expect.any(Object));
  });

  it('shows the error when loading fails', () => {
    users.getUsers.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.loadUsers();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });
});
