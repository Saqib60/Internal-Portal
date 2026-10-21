import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, MatIconModule],
  template: `
    <div class="wrap">
      <aside class="brand">
        <div class="logo"><span>ESS</span><div><strong>ESS Portal</strong><small>Employee Self-Service</small></div></div>
        <div class="pitch">
          <h1>Your work life,<br />all in one place.</h1>
          <p>Submit claims, request loans and advances, and track every approval without paperwork.</p>
          <ul>
            <li><mat-icon>description</mat-icon><div><strong>Medical, fuel and fee claims</strong><small>Fill in your form once and upload receipts online.</small></div></li>
            <li><mat-icon>credit_card</mat-icon><div><strong>Loans and advances</strong><small>PF loan and advance salary requests in a few steps.</small></div></li>
            <li><mat-icon>monitor_heart</mat-icon><div><strong>Track every request</strong><small>See where each request is and get notified at every step.</small></div></li>
          </ul>
        </div>
        <small class="copy">© {{ year }} NETSOL Technologies Limited. For employee use only.</small>
      </aside>
      <main class="panel">
        <router-outlet />
        <p class="help">Need help? Call the IT helpdesk at ext. 2100</p>
      </main>
    </div>
  `,
  styles: [`
    .wrap { display: grid; grid-template-columns: 5fr 7fr; min-height: 100vh; }
    .brand { background: radial-gradient(120% 80% at 80% 10%, #1f3a8a 0%, transparent 60%), radial-gradient(90% 60% at 10% 90%, #1b3270 0%, transparent 60%), var(--navy);
      color: #fff; padding: 40px 44px; display: flex; flex-direction: column; }
    .logo { display: flex; gap: 12px; align-items: center;
      span { width: 46px; height: 46px; border-radius: 10px; background: #2f63e6; display: grid; place-items: center; font-weight: 700; font-size: 14px; }
      strong { display: block; font-size: 17px; } small { color: #b8c3e0; font-size: 12.5px; } }
    .pitch { margin: auto 0; max-width: 460px;
      h1 { color: #fff; font-size: 38px; line-height: 1.2; font-weight: 700; letter-spacing: -.02em; }
      p { color: #cbd5ee; font-size: 15px; line-height: 1.6; margin: 18px 0 28px; }
      ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 16px; }
      li { display: flex; gap: 14px; align-items: center;
        mat-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); display: grid; place-items: center; font-size: 20px; color: #c9d6ff; flex: none; }
        strong { display: block; font-size: 14px; } small { color: #aab6d6; font-size: 12.5px; } } }
    .copy { color: #8492b8; font-size: 12px; }
    .panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; background: var(--bg); }
    .help { color: var(--muted); font-size: 12.5px; margin-top: 20px; }
    @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } .brand { display: none; } }
  `],
})
export class AuthLayoutComponent {
  readonly year = new Date().getFullYear();
}
