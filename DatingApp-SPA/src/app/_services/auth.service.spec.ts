import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { aUser, fakeToken } from '../_testing/test-helpers';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('logs in, storing the token and user and decoding the token', () => {
    const token = fakeToken({ nameid: '1', unique_name: 'ines' });
    const user = aUser();
    let photo: string;
    service.currentPhotoUrl.subscribe(url => photo = url);

    service.login({ username: 'ines', password: 'password' }).subscribe();
    const req = http.expectOne('http://localhost:5000/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'ines', password: 'password' });
    req.flush({ token, user });

    expect(localStorage.getItem('token')).toBe(token);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(JSON.parse(JSON.stringify(user)));
    expect(service.decodedToken.unique_name).toBe('ines');
    expect(service.currentUser.knownAs).toBe('Ines');
    expect(photo).toBe(user.photoUrl);
  });

  it('stores nothing when the login response is empty', () => {
    service.login({ username: 'ines', password: 'password' }).subscribe();
    http.expectOne('http://localhost:5000/api/auth/login').flush(null);

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('registers a user', () => {
    const user = aUser();

    service.register(user).subscribe();
    const req = http.expectOne('http://localhost:5000/api/auth/register');

    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(user);
    req.flush({});
  });

  it('is logged in only while a token that has not expired is stored', () => {
    expect(service.loggedIn()).toBe(false);

    localStorage.setItem('token', fakeToken({}, 3600));
    expect(service.loggedIn()).toBe(true);

    localStorage.setItem('token', fakeToken({}, -3600));
    expect(service.loggedIn()).toBe(false);
  });

  it('starts with the default photo and publishes photo changes', () => {
    const photos: string[] = [];
    service.currentPhotoUrl.subscribe(url => photos.push(url));

    service.changeMemberPhoto('new.jpg');

    expect(photos).toEqual(['../../assets/user.png', 'new.jpg']);
  });
});
