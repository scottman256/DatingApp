import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpRequest, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { throwError } from 'rxjs';
import { ErrorInterceptor, ErrorInterceptorProvider } from './error.interceptor';

describe('ErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorInterceptorProvider, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function errorFor(body: any, status: number, statusText: string, headers: Record<string, string> = {}) {
    let error: any;
    http.get('/api/test').subscribe({ error: e => error = e });
    backend.expectOne('/api/test').flush(body, { status, statusText, headers });
    return error;
  }

  it('passes successful responses through', () => {
    let body: any;
    http.get('/api/test').subscribe(b => body = b);
    backend.expectOne('/api/test').flush({ ok: true });

    expect(body).toEqual({ ok: true });
  });

  it('turns 401 responses into their status text', () => {
    expect(errorFor(null, 401, 'Unauthorized')).toBe('Unauthorized');
  });

  it('uses the Application-Error header when the API sends one', () => {
    expect(errorFor('details', 500, 'Server Error', { 'Application-Error': 'Something broke' })).toBe('Something broke');
  });

  it('joins model validation errors', () => {
    const body = { errors: { Password: ['Too short'], City: ['Required'], Empty: null } };

    expect(errorFor(body, 400, 'Bad Request')).toBe('Too short\nRequired\n');
  });

  it('returns the error body when it has no validation errors', () => {
    expect(errorFor('Username already exists', 400, 'Bad Request')).toBe('Username already exists');
  });

  // HttpErrorResponse turns an empty body into null, which the 2020 code reads without a check,
  // so its 'Server Error' fallback is never reached. Kept as it was.
  it('fails on an empty error body, as the original code did', () => {
    let error: any;
    const next = { handle: () => throwError(() => new HttpErrorResponse({ error: '', status: 500 })) };
    new ErrorInterceptor().intercept(new HttpRequest('GET', '/api/test'), next).subscribe({ error: e => error = e });

    expect(error).toBeInstanceOf(TypeError);
  });
});
