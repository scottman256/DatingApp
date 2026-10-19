import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { AboutComponent } from './about.component';
import { AuthService } from '../_services/auth.service';

describe('AboutComponent', () => {
  let auth: { loggedIn: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { loggedIn: vi.fn(() => false) };
    TestBed.configureTestingModule({
      declarations: [AboutComponent],
      imports: [RouterModule.forRoot([])],
      providers: [{ provide: AuthService, useValue: auth }],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(AboutComponent);
    fixture.detectChanges();
    return fixture;
  }

  function buttonNamed(fixture: any, name: string): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(b => b.textContent.trim() === name);
  }

  async function navigationFrom(button: HTMLButtonElement) {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    button.click();
    return navigate.mock.calls[0][0].toString();
  }

  it('describes the app and its features', () => {
    const page: HTMLElement = create().nativeElement;

    expect(page.querySelector('h1').textContent).toBe('Meet people you\'ll actually click with');
    expect(Array.from(page.querySelectorAll('.card-title')).map(t => t.textContent)).toEqual([
      'Matches that fit you', 'Profiles with personality', 'Let them know with a like',
      'Private conversations', 'Show your best side', 'Your privacy, protected'
    ]);
    expect(page.querySelectorAll('.feature-icon .fa-heart').length).toBe(1);
  });

  it('explains how it works in three numbered steps', () => {
    const page: HTMLElement = create().nativeElement;

    expect(Array.from(page.querySelectorAll('.step-number')).map(n => n.textContent)).toEqual(['1', '2', '3']);
    expect(page.textContent).toContain('Start the conversation');
  });

  it('sends visitors to the registration form', async () => {
    const fixture = create();

    expect(buttonNamed(fixture, 'See your matches')).toBeUndefined();
    expect(await navigationFrom(buttonNamed(fixture, 'Register now'))).toBe('/home?register=true');
  });

  it('takes visitors back to the home page', async () => {
    expect(await navigationFrom(buttonNamed(create(), 'Back to home'))).toBe('/home');
  });

  it('sends members to their matches', async () => {
    auth.loggedIn.mockReturnValue(true);
    const fixture = create();

    expect(buttonNamed(fixture, 'Register now')).toBeUndefined();
    expect(await navigationFrom(buttonNamed(fixture, 'See your matches'))).toBe('/members');
  });
});
