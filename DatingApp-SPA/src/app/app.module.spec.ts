import { NgModule, NgZone, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';

describe('AppModule', () => {
  it('should render values from the API without a manual change detection call', async () => {
    await TestBed.configureTestingModule({
      imports: [ AppModule ],
      providers: [ provideHttpClientTesting() ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.autoDetectChanges();

    TestBed.inject(HttpTestingController).expectOne('http://localhost:5000/api/values').flush([
      { id: 1, name: 'Value 101' },
      { id: 2, name: 'Value 102' }
    ]);
    await fixture.whenStable();

    const rendered = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('app-value p'))
      .map(p => p.textContent.trim());
    expect(rendered).toEqual([ '1, Value 101', '2, Value 102' ]);
  });

  it('should opt in to zone-based change detection, since bootstrapModule defaults to zoneless', () => {
    // Mirrors bootstrapModule, which applies a zoneless default underneath the module's own providers.
    @NgModule({ providers: [ provideZonelessChangeDetection() ] })
    class ZonelessByDefaultModule { }

    vi.spyOn(console, 'warn').mockImplementation(() => {}); // zoneless + zone.js loaded logs a dev-mode warning
    TestBed.configureTestingModule({
      imports: [ ZonelessByDefaultModule, AppModule ]
    });

    expect(TestBed.inject(NgZone)).toBeInstanceOf(NgZone);
  });
});
