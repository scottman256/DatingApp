import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { aMessage, aUser } from '../_testing/test-helpers';

describe('UserService', () => {
  const api = 'http://localhost:5000/api/';
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets a page of users with the filters and parses the Pagination header', () => {
    const pagination = { currentPage: 2, itemsPerPage: 5, totalItems: 12, totalPages: 3 };
    let result: any;

    service.getUsers(2, 5, { minAge: 20, maxAge: 30, gender: 'male', orderBy: 'created' }).subscribe(r => result = r);
    const req = http.expectOne(r => r.url === api + 'users');
    expect(req.request.params.toString()).toBe('pageNumber=2&pageSize=5&minAge=20&maxAge=30&gender=male&orderBy=created');
    req.flush([aUser()], { headers: { Pagination: JSON.stringify(pagination) } });

    expect(result.result).toEqual([aUser()]);
    expect(result.pagination).toEqual(pagination);
  });

  it('gets users without paging or filters, and without a Pagination header', () => {
    let result: any;

    service.getUsers().subscribe(r => result = r);
    const req = http.expectOne(r => r.url === api + 'users');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);

    expect(result.pagination).toBeUndefined();
  });

  it('asks for likers or likees', () => {
    service.getUsers(1, 5, null, 'Likers').subscribe();
    expect(http.expectOne(r => r.url === api + 'users').request.params.get('likers')).toBe('true');

    service.getUsers(1, 5, null, 'Likees').subscribe();
    expect(http.expectOne(r => r.url === api + 'users').request.params.get('likees')).toBe('true');
  });

  it('gets and updates a user', () => {
    service.getUser(3).subscribe();
    expect(http.expectOne(api + 'users/3').request.method).toBe('GET');

    service.updateUser(3, aUser()).subscribe();
    expect(http.expectOne(api + 'users/3').request.method).toBe('PUT');
  });

  it('sets the main photo and deletes photos', () => {
    service.setMainPhoto(1, 7).subscribe();
    expect(http.expectOne(api + 'users/1/photos/7/setMain').request.method).toBe('POST');

    service.deletePhoto(1, 7).subscribe();
    // The original code has a space before the user id; the API still parses it.
    expect(http.expectOne(api + 'users/ 1/photos/7').request.method).toBe('DELETE');
  });

  it('sends a like', () => {
    service.sendLike(1, 6).subscribe();

    expect(http.expectOne(api + 'users/1/like/6').request.method).toBe('POST');
  });

  it('gets a page of messages for a container', () => {
    const pagination = { currentPage: 1, itemsPerPage: 5, totalItems: 1, totalPages: 1 };
    let result: any;

    service.getMessages(1, 1, 5, 'Inbox').subscribe(r => result = r);
    const req = http.expectOne(r => r.url === api + 'users/1/messages');
    expect(req.request.params.toString()).toBe('MessageContainer=Inbox&pageNumber=1&pageSize=5');
    req.flush([aMessage()], { headers: { Pagination: JSON.stringify(pagination) } });

    expect(result.result.length).toBe(1);
    expect(result.pagination).toEqual(pagination);
  });

  it('gets messages without paging', () => {
    let result: any;

    service.getMessages(1, null, null, 'Unread').subscribe(r => result = r);
    const req = http.expectOne(r => r.url === api + 'users/1/messages');
    expect(req.request.params.keys()).toEqual(['MessageContainer']);
    req.flush([]);

    expect(result.pagination).toBeUndefined();
  });

  it('gets a message thread, sends, deletes and marks messages as read', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    service.getMessageThread(1, 6).subscribe();
    expect(http.expectOne(api + 'users/1/messages/thread/6').request.method).toBe('GET');

    service.sendMessage(1, aMessage()).subscribe();
    expect(http.expectOne(api + 'users/1/messages').request.method).toBe('POST');

    service.deleteMessage(9, 1).subscribe();
    expect(http.expectOne(api + 'users/1/messages/9').request.method).toBe('POST');

    service.markAsRead(1, 9);
    expect(http.expectOne(api + 'users/1/messages/9/read').request.method).toBe('POST');
  });
});
