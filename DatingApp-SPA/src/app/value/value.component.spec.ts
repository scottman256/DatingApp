import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ValueComponent } from './value.component';

describe('ValueComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ValueComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and lists the values', () => {
    const fixture = TestBed.createComponent(ValueComponent);
    fixture.detectChanges();

    http.expectOne('http://localhost:5000/api/values').flush([{ id: 1, name: 'Value 101' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1, Value 101');
  });

  it('logs the error when loading fails', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const fixture = TestBed.createComponent(ValueComponent);
    fixture.detectChanges();

    http.expectOne('http://localhost:5000/api/values').flush('down', { status: 500, statusText: 'Server Error' });

    expect(log).toHaveBeenCalled();
    expect(fixture.componentInstance.values).toBeUndefined();
  });
});
