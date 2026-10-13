import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MessagesComponent } from './messages.component';
import { AuthService } from '../_services/auth.service';
import { UserService } from '../_services/user.service';
import { AlertifyService } from '../_services/alertify.service';
import { aMessage, fakeAlertify } from '../_testing/test-helpers';

describe('MessagesComponent', () => {
  const pagination = { currentPage: 1, itemsPerPage: 5, totalItems: 2, totalPages: 1 };
  let users: { getMessages: ReturnType<typeof vi.fn>; deleteMessage: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    users = {
      getMessages: vi.fn(() => of({ result: [aMessage({ id: 3, content: 'Outgoing' })], pagination })),
      deleteMessage: vi.fn(() => of({}))
    };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MessagesComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { data: of({ messages: { result: [aMessage({ id: 1 }), aMessage({ id: 2, content: 'Second' })], pagination } }) } },
        { provide: AuthService, useValue: { decodedToken: { nameid: '1' } } },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(MessagesComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the unread messages from the resolver', () => {
    const fixture = create();

    expect(fixture.componentInstance.messageContainer).toBe('Unread');
    const rows = fixture.nativeElement.querySelectorAll('tr td:first-child');
    expect(Array.from(rows).map((r: HTMLElement) => r.textContent)).toEqual(['Hello', 'Second']);
  });

  it('shows "No messages" for an empty container', () => {
    users.getMessages.mockReturnValue(of({ result: [], pagination }));
    const fixture = create();

    fixture.componentInstance.Outbox();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No messages');
  });

  it.each([['Inbox'], ['Outbox'], ['Unread']])('loads the %s container', (container: string) => {
    const component = create().componentInstance;

    (component as any)[container]();

    expect(component.messageContainer).toBe(container);
    expect(users.getMessages).toHaveBeenCalledWith('1', 1, 5, container);
    expect(component.messages[0].content).toBe('Outgoing');
  });

  it('loads the selected page', () => {
    const component = create().componentInstance;

    component.pageChanged({ page: 2 });

    expect(users.getMessages).toHaveBeenCalledWith('1', 2, 5, 'Unread');
  });

  it('shows the error when loading fails', () => {
    users.getMessages.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.Inbox();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });

  it('deletes a message after confirmation', () => {
    const component = create().componentInstance;

    component.deleteMessage(1);

    expect(alertify.confirm).toHaveBeenCalledWith('Are you sure that you want to delete this message', expect.any(Function));
    expect(users.deleteMessage).toHaveBeenCalledWith(1, '1');
    expect(component.messages.map(m => m.id)).toEqual([2]);
    expect(alertify.success).toHaveBeenCalledWith('Message has been deleted');
  });

  it('shows an error when deleting fails', () => {
    users.deleteMessage.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.deleteMessage(1);

    expect(alertify.error).toHaveBeenCalledWith('Failed to delete the message');
    expect(component.messages.length).toBe(2);
  });
});
