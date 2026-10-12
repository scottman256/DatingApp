import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ValueComponent } from './value.component';

describe('ValueComponent', () => {
  const apiUrl = 'http://localhost:5000/api/values';
  let component: ValueComponent;
  let fixture: ComponentFixture<ValueComponent>;
  let httpMock: HttpTestingController;

  const renderedValues = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('p')).map(p => p.textContent.trim());

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValueComponent ],
      providers: [ provideHttpClient(), provideHttpClientTesting() ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValueComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpMock.expectOne(apiUrl).flush([]);

    expect(component).toBeTruthy();
  });

  it('should GET the values from the API on init', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should store and render each value returned by the API', () => {
    const values = [ { id: 1, name: 'Value 101' }, { id: 2, name: 'Value 102' } ];

    fixture.detectChanges();
    httpMock.expectOne(apiUrl).flush(values);
    fixture.detectChanges();

    expect(component.values).toEqual(values);
    expect(renderedValues()).toEqual([ '1, Value 101', '2, Value 102' ]);
  });

  it('should render nothing when the API returns no values', () => {
    fixture.detectChanges();
    httpMock.expectOne(apiUrl).flush([]);
    fixture.detectChanges();

    expect(component.values).toEqual([]);
    expect(renderedValues()).toEqual([]);
  });

  it('should log the error and render nothing when the request fails', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    fixture.detectChanges();
    httpMock.expectOne(apiUrl).flush('Server error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.values).toBeUndefined();
    expect(consoleLog).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
    expect(renderedValues()).toEqual([]);
  });

  it('should replace the values when getValues is called again', () => {
    fixture.detectChanges();
    httpMock.expectOne(apiUrl).flush([ { id: 1, name: 'Value 101' } ]);

    component.getValues();
    httpMock.expectOne(apiUrl).flush([ { id: 2, name: 'Value 102' } ]);
    fixture.detectChanges();

    expect(renderedValues()).toEqual([ '2, Value 102' ]);
  });
});
