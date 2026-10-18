import { User } from '../_models/user';
import { Message } from '../_models/message';

/** Builds an unsigned JWT like the API's, which is all jwt-decode and JwtHelperService read. */
export function fakeToken(payload: object = {}, expiresInSeconds = 3600): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS512', typ: 'JWT' })}.${encode({ nameid: '1', unique_name: 'ines', exp, ...payload })}.signature`;
}

export function aUser(overrides: Partial<User> = {}): User {
  return {
    id: 1, username: 'ines', knownAs: 'Ines', age: 40, gender: 'female',
    created: new Date('2017-03-14'), lastActive: new Date('2017-03-14'),
    photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg', city: 'Northridge', country: 'Congo',
    introduction: 'Intro', lookingFor: 'Someone', interests: 'Hiking',
    photos: [{ id: 1, url: 'https://randomuser.me/api/portraits/women/1.jpg', description: 'Me', dateAdded: new Date('2017-03-14'), isMain: true }],
    ...overrides
  };
}

export function aMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 1, senderId: 6, senderKnownAs: 'Ryan', senderPhotoUrl: 'ryan.jpg',
    recipientId: 1, recipientKnownAs: 'Ines', recipientPhotoUrl: 'ines.jpg',
    content: 'Hello', isRead: false, dateRead: null, messageSent: new Date('2020-05-01'),
    ...overrides
  };
}

/** A stand-in for AlertifyService whose confirm() runs the callback straight away, as if OK was clicked. */
export function fakeAlertify() {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    confirm: vi.fn((_message: string, ok: () => any) => ok())
  };
}
