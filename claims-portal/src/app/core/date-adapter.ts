import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Native adapter that also understands DD/MM/YYYY typed by hand (the format used across the portal). */
@Injectable()
export class DmyDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const m = value.trim().match(/^(\d{1,2})[/.\- ]+(\d{1,2})[/.\- ]+(\d{4})$/);
      if (m) {
        const d = new Date(+m[3], +m[2] - 1, +m[1]);
        return d.getMonth() === +m[2] - 1 ? d : this.invalid();
      }
    }
    return super.parse(value, parseFormat);
  }

  override format(date: Date, displayFormat: object): string {
    const f = displayFormat as Intl.DateTimeFormatOptions;
    if (f && f.day && f.month === 'numeric') {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      return `${dd} / ${mm} / ${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }
}
