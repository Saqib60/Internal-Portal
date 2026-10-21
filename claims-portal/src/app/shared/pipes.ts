import { Pipe, PipeTransform } from '@angular/core';

/** 15500 -> "15,500"; with prefix -> "PKR 15,500"; null -> "—" */
@Pipe({ name: 'pkr', standalone: true })
export class PkrPipe implements PipeTransform {
  transform(value: number | null | undefined, prefix = false): string {
    if (value === null || value === undefined || isNaN(+value)) return '—';
    const s = Math.round(+value).toLocaleString('en-US');
    return prefix ? `PKR ${s}` : s;
  }
}

@Pipe({ name: 'fileSize', standalone: true })
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
}

@Pipe({ name: 'relTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
