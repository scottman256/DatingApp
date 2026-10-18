import { TestBed } from '@angular/core/testing';
import { AlertifyService } from './alertify.service';

describe('AlertifyService', () => {
  let service: AlertifyService;

  const notifications = () => Array.from(document.querySelectorAll('.ajs-message')).map(m => m.textContent.trim());

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AlertifyService] });
    service = TestBed.inject(AlertifyService);
  });

  it('shows success, error, warning and plain notifications', () => {
    service.success('Saved');
    service.error('Failed');
    service.warning('Careful');
    service.message('Hello');

    expect(notifications()).toEqual(expect.arrayContaining(['Saved', 'Failed', 'Careful', 'Hello']));
    expect(document.querySelector('.ajs-success').textContent).toContain('Saved');
    expect(document.querySelector('.ajs-error').textContent).toContain('Failed');
  });

  it('runs the callback only when the confirm dialog is accepted', () => {
    const ok = vi.fn();

    service.confirm('Are you sure?', ok);
    const dialog = Array.from(document.querySelectorAll('.ajs-dialog')).pop() as HTMLElement;
    expect(dialog.textContent).toContain('Are you sure?');
    (dialog.querySelector('.ajs-ok') as HTMLElement).click();

    expect(ok).toHaveBeenCalledTimes(1);
  });

  it('does not run the callback when the confirm dialog is cancelled', () => {
    const ok = vi.fn();

    service.confirm('Delete it?', ok);
    const dialog = Array.from(document.querySelectorAll('.ajs-dialog')).pop() as HTMLElement;
    (dialog.querySelector('.ajs-cancel') as HTMLElement).click();

    expect(ok).not.toHaveBeenCalled();
  });
});
