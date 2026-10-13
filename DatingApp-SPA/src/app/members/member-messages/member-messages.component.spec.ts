import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MemberMessagesComponent } from './member-messages.component';
import { UserService } from 'src/app/_services/user.service';
import { AuthService } from 'src/app/_services/auth.service';
import { AlertifyService } from 'src/app/_services/alertify.service';
import { aMessage, fakeAlertify } from 'src/app/_testing/test-helpers';

describe('MemberMessagesComponent', () => {
  let users: Record<string, ReturnType<typeof vi.fn>>;
  let alertify: ReturnType<typeof fakeAlertify>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    users = {
      getMessageThread: vi.fn(() => of([
        aMessage({ id: 1, senderId: 6, recipientId: 1, isRead: false, content: 'Unread to me' }),
        aMessage({ id: 2, senderId: 6, recipientId: 1, isRead: true, content: 'Read to me' }),
        aMessage({ id: 3, senderId: 1, recipientId: 6, isRead: false, content: 'From me' })
      ])),
      markAsRead: vi.fn(),
      sendMessage: vi.fn(() => of(aMessage({ id: 4, senderId: 1, recipientId: 6, content: 'New' })))
    };
    alertify = fakeAlertify();
    TestBed.configureTestingModule({
      declarations: [MemberMessagesComponent],
      imports: [FormsModule],
      providers: [
        { provide: UserService, useValue: users },
        { provide: AuthService, useValue: { decodedToken: { nameid: '1' } } },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(MemberMessagesComponent);
    fixture.componentInstance.recipientId = 6;
    fixture.detectChanges();
    return fixture;
  }

  it('loads the conversation and marks unread messages to me as read', () => {
    const fixture = create();

    expect(users.getMessageThread).toHaveBeenCalledWith('1', 6);
    expect(fixture.componentInstance.messages.length).toBe(3);
    expect(users.markAsRead).toHaveBeenCalledTimes(1);
    expect(users.markAsRead).toHaveBeenCalledWith(1, 1);
    expect(fixture.nativeElement.textContent).toContain('Unread to me');
  });

  it('invites a first message when there are none', () => {
    users.getMessageThread.mockReturnValue(of([]));

    expect(create().nativeElement.textContent).toContain('No messags yet');
  });

  it('shows the error when loading fails', () => {
    users.getMessageThread.mockReturnValue(throwError(() => 'Server Error'));

    create();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });

  it('sends a message and adds it to the top of the conversation', () => {
    let sent: any;
    users.sendMessage.mockImplementation((id, message) => {
      sent = { id, ...message };
      return of(aMessage({ id: 4, senderId: 1, recipientId: 6, content: 'New' }));
    });
    const component = create().componentInstance;
    component.newMessage.content = 'New';

    component.sendMessage();

    expect(sent).toEqual({ id: '1', recipientId: 6, content: 'New' });
    expect(component.messages[0].id).toBe(4);
    expect(component.newMessage.content).toBe('');
  });

  it('shows the error when sending fails', () => {
    users.sendMessage.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.sendMessage();

    expect(alertify.error).toHaveBeenCalledWith('Server Error');
  });
});
