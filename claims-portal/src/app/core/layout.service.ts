import { Injectable, signal } from '@angular/core';
import { storage } from './storage';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Sidebar collapsed to the 72px icon rail. Remembered between visits. */
  readonly navCollapsed = signal(storage.get('ess.navCollapsed', false));

  toggleNav(): void {
    this.navCollapsed.update(v => !v);
    storage.set('ess.navCollapsed', this.navCollapsed());
  }
}
