import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PhotoEditorComponent } from './photo-editor.component';
import { AuthService } from '../_services/auth.service';
import { UserService } from '../_services/user.service';
import { AlertifyService } from '../_services/alertify.service';
import { Photo } from '../_models/photo';
import { aUser, fakeAlertify } from '../_testing/test-helpers';

describe('PhotoEditorComponent', () => {
  let auth: any;
  let users: { setMainPhoto: ReturnType<typeof vi.fn>; deletePhoto: ReturnType<typeof vi.fn> };
  let alertify: ReturnType<typeof fakeAlertify>;
  let photos: Photo[];

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    localStorage.setItem('token', 'the-token');
    auth = { decodedToken: { nameid: '1' }, currentUser: aUser(), changeMemberPhoto: vi.fn() };
    users = { setMainPhoto: vi.fn(() => of({})), deletePhoto: vi.fn(() => of({})) };
    alertify = fakeAlertify();
    photos = [
      { id: 1, url: 'main.jpg', description: '', dateAdded: new Date(), isMain: true },
      { id: 2, url: 'other.jpg', description: '', dateAdded: new Date(), isMain: false }
    ];
    TestBed.configureTestingModule({
      declarations: [PhotoEditorComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: UserService, useValue: users },
        { provide: AlertifyService, useValue: alertify }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
  });

  function create() {
    const fixture = TestBed.createComponent(PhotoEditorComponent);
    fixture.componentInstance.photos = photos;
    fixture.detectChanges();
    return fixture;
  }

  it('shows the photos with the main photo locked', () => {
    const fixture = create();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button.btn-sm'));

    expect(fixture.nativeElement.querySelectorAll('img.img-thumbnail').length).toBe(2);
    expect(buttons.map(b => b.disabled)).toEqual([true, true, false, false]);
  });

  it('uploads images as multipart form data to the logged-in user', () => {
    const uploader = create().componentInstance.uploader;

    expect(uploader.options.url).toBe('http://localhost:5000/api/users/1/photos');
    expect(uploader.options.authToken).toBe('Bearer the-token');
    expect(uploader.options.allowedFileType).toEqual(['image']);
    expect(uploader.options.maxFileSize).toBe(10 * 1024 * 1024);
    expect(uploader.options.disableMultipart).toBe(false);
    expect(uploader.options.formatDataFunctionIsAsync).toBe(false);
  });

  it('keeps the original (unused) data formatter', async () => {
    const uploader = create().componentInstance.uploader;

    await expect(uploader.options.formatDataFunction({ _file: { name: 'me.png' } })).resolves.toEqual({ File: 'me.png' });
  });

  it('highlights the drop zone while a file is dragged over it', () => {
    const component = create().componentInstance;

    component.fileOverBase(true);

    expect(component.hasBaseDropZoneOver).toBe(true);
  });

  it('sends uploads without credentials and keeps the latest response', () => {
    const component = create().componentInstance;
    const item: any = {};

    component.uploader.onAfterAddingFile(item);
    component.uploader.response.emit('{"id":3}');

    expect(item.withCredentials).toBe(false);
    expect(component.response).toBe('{"id":3}');
  });

  it('adds an uploaded photo to the list', () => {
    const component = create().componentInstance;

    component.uploader.onSuccessItem(null, JSON.stringify({ id: 3, url: 'new.jpg', isMain: false }), 201, {});

    expect(photos.map(p => p.id)).toEqual([1, 2, 3]);
    expect(auth.changeMemberPhoto).not.toHaveBeenCalled();
  });

  it('makes a first upload the main photo everywhere', () => {
    const component = create().componentInstance;

    component.uploader.onSuccessItem(null, JSON.stringify({ id: 3, url: 'new.jpg', isMain: true }), 201, {});

    expect(auth.changeMemberPhoto).toHaveBeenCalledWith('new.jpg');
    expect(auth.currentUser.photoUrl).toBe('new.jpg');
    expect(JSON.parse(localStorage.getItem('user')).photoUrl).toBe('new.jpg');
  });

  it('ignores an empty upload response', () => {
    const component = create().componentInstance;

    component.uploader.onSuccessItem(null, '', 201, {});

    expect(photos.length).toBe(2);
  });

  it('sets the main photo', () => {
    const component = create().componentInstance;

    component.setMainPhoto(photos[1]);

    expect(users.setMainPhoto).toHaveBeenCalledWith('1', 2);
    expect(photos.map(p => p.isMain)).toEqual([false, true]);
    expect(auth.changeMemberPhoto).toHaveBeenCalledWith('other.jpg');
    expect(JSON.parse(localStorage.getItem('user')).photoUrl).toBe('other.jpg');
  });

  it('shows the error when setting the main photo fails', () => {
    users.setMainPhoto.mockReturnValue(throwError(() => 'This is already the main photo'));
    const component = create().componentInstance;

    component.setMainPhoto(photos[0]);

    expect(alertify.error).toHaveBeenCalledWith('This is already the main photo');
  });

  it('deletes a photo after confirmation', () => {
    const component = create().componentInstance;

    component.deletePhoto(2);

    expect(alertify.confirm).toHaveBeenCalledWith('Are you sure you want to delete this photo?', expect.any(Function));
    expect(users.deletePhoto).toHaveBeenCalledWith('1', 2);
    expect(photos.map(p => p.id)).toEqual([1]);
    expect(alertify.success).toHaveBeenCalledWith('Photo has been deleted');
  });

  it('shows an error when deleting fails', () => {
    users.deletePhoto.mockReturnValue(throwError(() => 'Server Error'));
    const component = create().componentInstance;

    component.deletePhoto(2);

    expect(alertify.error).toHaveBeenCalledWith('Failed to delete the photo');
    expect(photos.length).toBe(2);
  });
});
