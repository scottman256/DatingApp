import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HomeComponent],
      providers: [provideHttpClient()],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  it('shows the welcome text and switches to the registration form', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Find your match');
    expect(fixture.nativeElement.querySelector('app-register')).toBeNull();

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.registerMode).toBe(true);
    expect(fixture.nativeElement.querySelector('app-register')).toBeTruthy();
  });

  it('leaves registration mode when the form is cancelled', () => {
    const component = TestBed.createComponent(HomeComponent).componentInstance;
    component.registerToggle();

    component.cancelRegisterMode(false);

    expect(component.registerMode).toBe(false);
  });
});
