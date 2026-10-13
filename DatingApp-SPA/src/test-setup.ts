// Runs Vitest's describe/it/beforeEach inside Angular's test zones, so the
// zone-based helpers used by the specs (waitForAsync, fakeAsync) work under Vitest.
import 'zone.js/plugins/vitest-patch';
