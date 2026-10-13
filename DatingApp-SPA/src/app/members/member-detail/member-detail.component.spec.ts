import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { MemberDetailComponent } from './member-detail.component';
import { UserService } from 'src/app/_services/user.service';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { aUser, fakeAlertify } from 'src/app/_testing/test-helpers';

describe('MemberDetailComponent', () => {
  const ryan = aUser({
    id: 6, knownAs: 'Ryan', city: 'Lupton', country: 'Portugal', age: 62, photoUrl: 'ryan.jpg',
    photos: [
      { id: 1, url: 'ryan.jpg', description: 'Main', dateAdded: new Date(), isMain: true },
      { id: 2, url: 'ryan2.jpg', description: 'Beach', dateAdded: new Date(), isMain: false }
    ]
  });
  let users: { getUser: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  function setup(queryParams: object) {
    users = { getUser: vi.fn(() => of(aUser({ knownAs: 'Reloaded' }))) };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MemberDetailComponent],
      imports: [TabsModule],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ user: ryan }), queryParams: of(queryParams), snapshot: { params: { id: '6' } } } },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    const fixture = TestBed.createComponent(MemberDetailComponent);
    fixture.detectChanges();
    return fixture;
  }

  const tick = () => new Promise(resolve => setTimeout(resolve));
  const activeTab = (fixture: any) => fixture.componentInstance.memberTabs.tabs.findIndex((t: any) => t.active);

  it('shows the member from the resolver', () => {
    const fixture = setup({});
    const text = fixture.nativeElement.textContent;

    expect(fixture.nativeElement.querySelector('h1').textContent).toBe("Ryan's Profile");
    expect(text).toContain('Lupton, Portugal');
    expect(text).toContain('62');
  });

  it('builds the photo gallery from the member photos', () => {
    const component = setup({}).componentInstance;

    expect(component.galleryImages).toEqual([
      { small: 'ryan.jpg', medium: 'ryan.jpg', large: 'ryan.jpg', description: 'Main' },
      { small: 'ryan2.jpg', medium: 'ryan2.jpg', large: 'ryan2.jpg', description: 'Beach' }
    ]);
    expect(component.galleryOptions[0]).toEqual(expect.objectContaining({ width: '500px', height: '500px', thumbnailsColumns: 4, preview: false }));
  });

  it('opens the first tab by default', async () => {
    const fixture = setup({});
    await tick();

    expect(activeTab(fixture)).toBe(0);
  });

  it('opens the tab given in the query string', async () => {
    const fixture = setup({ tab: 3 });
    await tick();

    expect(activeTab(fixture)).toBe(3);
  });

  it('opens the Messages tab from the Message button', async () => {
    const fixture = setup({});
    await tick();

    fixture.componentInstance.selectTab(3);

    expect(activeTab(fixture)).toBe(3);
  });

  it('reloads the member', () => {
    const component = setup({}).componentInstance;

    component.loadUser();

    expect(users.getUser).toHaveBeenCalledWith(6);
    expect(component.user.knownAs).toBe('Reloaded');
  });

  it('shows the error when reloading fails', () => {
    const component = setup({}).componentInstance;
    users.getUser.mockReturnValue(throwError(() => 'Server Error'));

    component.loadUser();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });
});
