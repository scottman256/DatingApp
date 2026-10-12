import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AppComponent } from './app.component';
import { ValueComponent } from './value/value.component';

describe('AppComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        ValueComponent
      ],
      providers: [ provideHttpClient(), provideHttpClientTesting() ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'app'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('app');
  });

  it('should render the Dating App heading', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:5000/api/values').flush([]);

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('h1').textContent.trim()).toBe('Dating App');
  });

  it('should render the values list', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    httpMock.expectOne('http://localhost:5000/api/values').flush([]);

    expect(fixture.nativeElement.querySelector('app-value')).toBeTruthy();
  });
});
