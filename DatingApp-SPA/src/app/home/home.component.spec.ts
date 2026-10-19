import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [RouterModule.forRoot([])],
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

  it('opens the About page from Learn more', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.nativeElement.querySelector('button.btn-info').click();

    expect(navigate.mock.calls[0][0].toString()).toBe('/about');
  });

  it('opens the registration form straight away when asked to in the link', async () => {
    await TestBed.inject(Router).navigateByUrl('/?register=true');
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-register')).toBeTruthy();
  });
});
