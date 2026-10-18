import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MemberListResolver } from './member-list.resolver';
import { MemberDetailResolver } from './member-detail.resolver';
import { MemberEditResolver } from './member-edit.resolver';
import { ListsResolver } from './lists.resolver';
import { MessagesResolver } from './messages.resolver';
import { UserService } from '../_services/user.service';
import { AuthService } from '../_services/auth.service';
import { AlertifyService } from '../_services/alertify.service';
import { aUser, fakeAlertify } from '../_testing/test-helpers';

describe('Resolvers', () => {
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let alertify: ReturnType<typeof fakeAlertify>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  const route = { params: { id: 6 } } as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    users = { getUsers: vi.fn(), getUser: vi.fn(), getMessages: vi.fn() };
    alertify = fakeAlertify();
    router = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        MemberListResolver, MemberDetailResolver, MemberEditResolver, ListsResolver, MessagesResolver,
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: { decodedToken: { nameid: '1' } } },
        { provide: AlertifyService, useValue: alertify },
        { provide: Router, useValue: router }
      ]
    });
  });

  function resolved(resolver: { resolve(route: ActivatedRouteSnapshot): any }) {
    let value: any = 'not resolved';
    resolver.resolve(route).subscribe((v: any) => value = v);
    return value;
  }

  it('MemberListResolver loads the first page of 5 users', () => {
    const page = { result: [aUser()], pagination: null };
    users.getUsers.mockReturnValue(of(page));

    expect(resolved(TestBed.inject(MemberListResolver))).toBe(page);
    expect(users.getUsers).toHaveBeenCalledWith(1, 5);
  });

  it('ListsResolver loads the first page of users who like me', () => {
    users.getUsers.mockReturnValue(of('page'));

    expect(resolved(TestBed.inject(ListsResolver))).toBe('page');
    expect(users.getUsers).toHaveBeenCalledWith(1, 5, null, 'Likers');
  });

  it('MemberDetailResolver loads the user in the route', () => {
    users.getUser.mockReturnValue(of(aUser()));

    expect(resolved(TestBed.inject(MemberDetailResolver)).knownAs).toBe('Ines');
    expect(users.getUser).toHaveBeenCalledWith(6);
  });

  it('MemberEditResolver loads the logged-in user', () => {
    users.getUser.mockReturnValue(of(aUser()));

    expect(resolved(TestBed.inject(MemberEditResolver)).knownAs).toBe('Ines');
    expect(users.getUser).toHaveBeenCalledWith('1');
  });

  it('MessagesResolver loads the first page of unread messages', () => {
    users.getMessages.mockReturnValue(of('messages'));

    expect(resolved(TestBed.inject(MessagesResolver))).toBe('messages');
    expect(users.getMessages).toHaveBeenCalledWith('1', 1, 5, 'Unread');
  });

  it.each([
    [MemberListResolver, 'getUsers', 'Poblem retrieving data', '/home'],
    [ListsResolver, 'getUsers', 'Poblem retrieving data', '/home'],
    [MemberDetailResolver, 'getUser', 'Poblem retrieving data', '/members'],
    [MemberEditResolver, 'getUser', 'SMH Problem retrieving data', '/members'],
    [MessagesResolver, 'getMessages', 'Poblem retrieving messages', '/home'],
  ])('%o shows an error and navigates away when loading fails', (type: any, method: string, message: string, url: string) => {
    users[method].mockReturnValue(throwError(() => 'Server Error'));

    expect(resolved(TestBed.inject(type))).toBeNull();
    expect(alertify.error).toHaveBeenCalledWith(message);
    expect(router.navigate).toHaveBeenCalledWith([url]);
  });
});
