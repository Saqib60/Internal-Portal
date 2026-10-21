import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Client-side mock captcha drawn on a canvas. In production replace with your
 * captcha provider and verify the token on the server.
 */
@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <canvas #canvas width="150" height="40" aria-label="Security check image"></canvas>
    <button mat-stroked-button type="button" class="refresh" (click)="refresh()" matTooltip="New code" aria-label="Refresh security check">
      <mat-icon>refresh</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: flex; gap: 8px; align-items: center; }
    canvas { border-radius: 8px; border: 1px solid var(--border-strong); width: 150px; height: 40px; }
    .refresh { min-width: 40px; width: 40px; height: 40px; padding: 0; mat-icon { margin: 0; } }
  `],
})
export class CaptchaComponent implements AfterViewInit {
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @Output() refreshed = new EventEmitter<void>();
  private code = '';

  ngAfterViewInit(): void {
    this.refresh(false);
  }

  /** Case-insensitive check, ignoring spaces. */
  matches(input: string | null | undefined): boolean {
    return !!input && input.replace(/\s/g, '').toLowerCase() === this.code.toLowerCase();
  }

  refresh(emit = true): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    this.code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    this.draw();
    if (emit) this.refreshed.emit();
  }

  private draw(): void {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;
    const w = 150, h = 40;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#e8eefc');
    g.addColorStop(1, '#f6f8fd');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(31,79,216,${0.15 + Math.random() * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
    const colors = ['#1b2a5c', '#7a2e1c', '#155e3b', '#4c1d95', '#0f1b3d'];
    [...this.code].forEach((c, i) => {
      ctx.save();
      ctx.translate(14 + i * 22, 27 + (Math.random() * 6 - 3));
      ctx.rotate((Math.random() - 0.5) * 0.5);
      ctx.font = `${600 + Math.round(Math.random()) * 100} ${19 + Math.random() * 4}px Inter, sans-serif`;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillText(c, 0, 0);
      ctx.restore();
    });
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = 'rgba(15,27,61,.25)';
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
  }
}
