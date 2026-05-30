import { useEffect, useMemo, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Decision = 'ALLOW' | 'BLOCK' | 'REQUIRE APPROVAL';
type Source = 'claude' | 'cli' | 'web';

interface Delta {
  token: string;
  amount: number;
  usd?: number;
  gas?: boolean;
  note?: string;
}

interface Check {
  k: string;
  v: boolean | string;
  good?: boolean;
  bad?: boolean;
  warn?: boolean;
}

interface EventItem {
  id: string;
  ts: string;
  ago: string;
  source: Source;
  intent: string;
  action: string;
  params: Record<string, string>;
  decision: Decision;
  risk: number;
  policy: string;
  policyType: 'ok' | 'block' | 'approve';
  deltas: Delta[];
  checks: Check[];
  _new?: boolean;
}

interface Policy {
  id: string;
  name: string;
  kind: string;
  enabled: boolean;
  summary: string;
  json: Record<string, unknown>;
}

interface Delegation {
  id: string;
  grantee: string;
  scope: string;
  granted: string;
  expires: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = {
  processed: 1247,
  processedDelta: '+182 / 24h',
  blocked: 38,
  blockedDelta: '+5 / 24h',
  avgRisk: 23,
  requireApproval: 14,
  upstream: 'wallet-agent.monad',
  proxyName: 'compass-mcp-proxy',
  uptime: '14d 06h',
  network: 'Monad Testnet',
  chainId: 10143,
  blockHeight: '8,412,990',
};

const SEED_EVENTS: EventItem[] = [
  {
    id: 'EVT-9F2A41', ts: '2026-05-30 14:22:08', ago: 'just now', source: 'claude',
    intent: 'Send 5 MON to my hardware wallet 0x9f3a…b2e1', action: 'transfer_native',
    params: { to: '0x9f3a4c7e8821d4f0a55bc9012e7d3a99c4b2e1', amount: '5 MON' },
    decision: 'ALLOW', risk: 8, policy: 'Allowlisted recipient · within MON daily limit', policyType: 'ok',
    deltas: [{ token: 'MON', amount: -5, usd: -10.45 }, { token: 'MON', amount: -0.00021, usd: -0.0004, gas: true }],
    checks: [{ k: 'Destination on allowlist', v: true }, { k: 'Within spend limit (5 / 50 MON)', v: true }, { k: 'Unlimited approval', v: false, good: true }, { k: 'Contract reputation', v: 'n/a — EOA' }],
  },
  {
    id: 'EVT-9F2A40', ts: '2026-05-30 14:21:55', ago: '12s ago', source: 'claude',
    intent: 'Approve unlimited USDC spending for QuickSwap router', action: 'approve(spender, MAX_UINT256)',
    params: { spender: '0x1b02…dE5a', token: 'USDC', amount: '∞ (unlimited)' },
    decision: 'BLOCK', risk: 94, policy: 'Blocked: Unlimited approval detected', policyType: 'block',
    deltas: [{ token: 'USDC', amount: 0, usd: 0, note: 'allowance → ∞' }],
    checks: [{ k: 'Unlimited approval', v: true, bad: true }, { k: 'Spender in allowlist', v: false, bad: true }, { k: 'Contract reputation', v: '62 / 100 — unverified' }, { k: 'Within spend limit', v: false, bad: true }],
  },
  {
    id: 'EVT-9F2A3E', ts: '2026-05-30 14:20:31', ago: '1m ago', source: 'cli',
    intent: 'Swap 20 USDC for MON on the cheapest route', action: 'swapExactTokensForTokens',
    params: { in: '20 USDC', out: '~9.4 MON', router: '0x1b02…dE5a' },
    decision: 'REQUIRE APPROVAL', risk: 47, policy: 'Swap value above auto-approve threshold ($15)', policyType: 'approve',
    deltas: [{ token: 'USDC', amount: -20, usd: -20.0 }, { token: 'MON', amount: 9.41, usd: 19.67 }, { token: 'MON', amount: -0.00038, usd: -0.0008, gas: true }],
    checks: [{ k: 'Router on allowlist', v: true }, { k: 'Slippage within 1.0%', v: true }, { k: 'Value over auto-approve ($20 > $15)', v: true, warn: true }, { k: 'Contract reputation', v: '88 / 100 — verified' }],
  },
  {
    id: 'EVT-9F2A3C', ts: '2026-05-30 14:18:02', ago: '4m ago', source: 'web',
    intent: 'Transfer 1,000 USDC to 0x0000…dEaD', action: 'transfer_token',
    params: { to: '0x0000…dEaD', token: 'USDC', amount: '1000 USDC' },
    decision: 'BLOCK', risk: 88, policy: 'Blocked: Destination flagged (burn / null address)', policyType: 'block',
    deltas: [{ token: 'USDC', amount: -1000, usd: -1000.0 }],
    checks: [{ k: 'Destination on allowlist', v: false, bad: true }, { k: 'Known burn / null address', v: true, bad: true }, { k: 'Exceeds USDC daily limit', v: true, bad: true }, { k: 'Contract reputation', v: 'n/a — EOA' }],
  },
  {
    id: 'EVT-9F2A39', ts: '2026-05-30 14:15:47', ago: '7m ago', source: 'claude',
    intent: "Send 0.5 MON to saved contact 'Dev Faucet'", action: 'transfer_native',
    params: { to: '0x77ab…9c40', amount: '0.5 MON' },
    decision: 'ALLOW', risk: 5, policy: 'Allowlisted recipient · low value', policyType: 'ok',
    deltas: [{ token: 'MON', amount: -0.5, usd: -1.05 }, { token: 'MON', amount: -0.00019, usd: -0.0004, gas: true }],
    checks: [{ k: 'Destination on allowlist', v: true }, { k: 'Within spend limit', v: true }, { k: 'Unlimited approval', v: false, good: true }, { k: 'Contract reputation', v: 'n/a — EOA' }],
  },
  {
    id: 'EVT-9F2A35', ts: '2026-05-30 14:11:20', ago: '11m ago', source: 'cli',
    intent: 'Bridge 50 USDC to contract 0x4d…f1 on chain 999', action: 'depositERC20',
    params: { token: 'USDC', amount: '50 USDC', target: '0x4d12…aef1' },
    decision: 'BLOCK', risk: 79, policy: 'Blocked: Unverified bridge contract (reputation < 40)', policyType: 'block',
    deltas: [{ token: 'USDC', amount: -50, usd: -50.0 }],
    checks: [{ k: 'Target on allowlist', v: false, bad: true }, { k: 'Contract reputation', v: '31 / 100 — high risk', bad: true }, { k: 'Cross-chain destination unknown', v: true, bad: true }, { k: 'Within spend limit', v: true }],
  },
  {
    id: 'EVT-9F2A31', ts: '2026-05-30 14:06:54', ago: '16m ago', source: 'claude',
    intent: 'Stake 12 MON into the validator pool', action: 'delegate(validator, amount)',
    params: { validator: '0xab90…7732', amount: '12 MON' },
    decision: 'ALLOW', risk: 18, policy: 'Verified staking contract · within limit', policyType: 'ok',
    deltas: [{ token: 'MON', amount: -12, usd: -25.08 }, { token: 'MON', amount: -0.00042, usd: -0.0009, gas: true }],
    checks: [{ k: 'Contract on allowlist', v: true }, { k: 'Contract reputation', v: '96 / 100 — verified' }, { k: 'Within spend limit (12 / 50 MON)', v: true }, { k: 'Unlimited approval', v: false, good: true }],
  },
  {
    id: 'EVT-9F2A2D', ts: '2026-05-30 14:01:38', ago: '22m ago', source: 'web',
    intent: 'Approve 100 USDC for QuickSwap router', action: 'approve(spender, 100e6)',
    params: { spender: '0x1b02…dE5a', token: 'USDC', amount: '100 USDC' },
    decision: 'ALLOW', risk: 26, policy: 'Bounded approval · verified router', policyType: 'ok',
    deltas: [{ token: 'USDC', amount: 0, usd: 0, note: 'allowance → 100 USDC' }, { token: 'MON', amount: -0.00016, usd: -0.0003, gas: true }],
    checks: [{ k: 'Bounded (not unlimited)', v: true, good: true }, { k: 'Spender on allowlist', v: true }, { k: 'Contract reputation', v: '88 / 100 — verified' }, { k: 'Within spend limit', v: true }],
  },
];

const INCOMING_TEMPLATES: Omit<EventItem, 'id' | 'ts' | 'ago'>[] = [
  { source: 'claude', intent: 'Send 2 MON to 0x9f3a…b2e1', action: 'transfer_native', params: { to: '0x9f3a…b2e1', amount: '2 MON' }, decision: 'ALLOW', risk: 7, policy: 'Allowlisted recipient · within MON daily limit', policyType: 'ok', deltas: [{ token: 'MON', amount: -2, usd: -4.18 }, { token: 'MON', amount: -0.0002, usd: -0.0004, gas: true }], checks: [{ k: 'Destination on allowlist', v: true }, { k: 'Within spend limit', v: true }, { k: 'Unlimited approval', v: false, good: true }, { k: 'Contract reputation', v: 'n/a — EOA' }] },
  { source: 'cli', intent: 'Set approval for ALL tokens to 0x9e…aa', action: 'setApprovalForAll(operator, true)', params: { operator: '0x9e21…00aa', scope: 'ALL collections' }, decision: 'BLOCK', risk: 91, policy: 'Blocked: Blanket operator approval detected', policyType: 'block', deltas: [{ token: '—', amount: 0, usd: 0, note: 'operator → ALL assets' }], checks: [{ k: 'Blanket approval (setApprovalForAll)', v: true, bad: true }, { k: 'Operator on allowlist', v: false, bad: true }, { k: 'Contract reputation', v: '44 / 100 — unverified', bad: true }, { k: 'Within policy', v: false, bad: true }] },
  { source: 'web', intent: 'Swap 8 USDC for MON', action: 'swapExactTokensForTokens', params: { in: '8 USDC', out: '~3.8 MON', router: '0x1b02…dE5a' }, decision: 'ALLOW', risk: 21, policy: 'Below auto-approve threshold · verified router', policyType: 'ok', deltas: [{ token: 'USDC', amount: -8, usd: -8.0 }, { token: 'MON', amount: 3.79, usd: 7.92 }, { token: 'MON', amount: -0.0003, usd: -0.0006, gas: true }], checks: [{ k: 'Router on allowlist', v: true }, { k: 'Below auto-approve ($8 < $15)', v: true, good: true }, { k: 'Slippage within 1.0%', v: true }, { k: 'Contract reputation', v: '88 / 100 — verified' }] },
];

const POLICIES: Policy[] = [
  { id: 'spend-mon', name: 'MON spending limit', kind: 'Spend limit', enabled: true, summary: 'Max 50 MON / day · 5 MON per single transfer auto-approved', json: { rule: 'spend_limit', token: 'MON', per_tx_auto_approve: 5, daily_cap: 50, over_cap: 'block' } },
  { id: 'spend-usdc', name: 'USDC spending limit', kind: 'Spend limit', enabled: true, summary: 'Max 500 USDC / day · swaps over $15 require approval', json: { rule: 'spend_limit', token: 'USDC', per_tx_auto_approve: 15, daily_cap: 500, over_cap: 'block' } },
  { id: 'approvals', name: 'Approval guard', kind: 'Risk rule', enabled: true, summary: 'Block unlimited approvals & setApprovalForAll', json: { rule: 'approval_guard', block_unlimited: true, block_set_approval_for_all: true, max_allowance_usd: 250 } },
  { id: 'allowlist', name: 'Recipient allowlist', kind: 'Allowlist', enabled: true, summary: '6 trusted addresses · all others require approval', json: { rule: 'recipient_allowlist', mode: 'require_approval_if_unlisted', addresses: ['0x9f3a…b2e1 (hardware wallet)', '0x77ab…9c40 (Dev Faucet)', '0xab90…7732 (validator)', '0x1b02…dE5a (QuickSwap router)'] } },
  { id: 'reputation', name: 'Contract reputation floor', kind: 'Risk rule', enabled: true, summary: 'Block interactions with contracts scoring below 50 / 100', json: { rule: 'reputation_floor', min_score: 50, unverified: 'require_approval', below_floor: 'block' } },
  { id: 'autonomy', name: 'Agent autonomy level', kind: 'Mode', enabled: true, summary: 'GUARDED — auto-approve only allowlisted + below thresholds', json: { rule: 'autonomy', level: 'guarded', options: ['observe', 'guarded', 'autonomous'] } },
];

const DELEGATIONS: Delegation[] = [
  { id: 'del-1', grantee: 'claude-code', scope: 'transfer_native, swap (guarded)', granted: '2026-05-12', expires: '2026-06-12' },
  { id: 'del-2', grantee: 'cli-runner', scope: 'read-only · simulate', granted: '2026-05-20', expires: '—' },
  { id: 'del-3', grantee: 'web-console', scope: 'transfer_token (require approval)', granted: '2026-05-28', expires: '2026-06-04' },
];

// ── Icons ─────────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  shield: 'M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z',
  shieldCheck: 'M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z|M9 12l2 2 4-4',
  terminal: 'M4 5h16v14H4z|M7 9l3 3-3 3|M13 15h4',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z|M3 12h18|M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9s1.3-6.5 3.8-9Z',
  code: 'M8 7l-5 5 5 5|M16 7l5 5-5 5',
  arrowRight: 'M4 12h16|M14 6l6 6-6 6',
  check: 'M5 12l4 4 10-10',
  x: 'M6 6l12 12|M18 6 6 18',
  alert: 'M12 3 2 20h20L12 3Z|M12 10v4|M12 17h.01',
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  layers: 'M12 3 2 8l10 5 10-5-10-5Z|M2 14l10 5 10-5',
  list: 'M8 6h13|M8 12h13|M8 18h13|M3 6h.01|M3 12h.01|M3 18h.01',
  sliders: 'M4 6h10|M18 6h2|M4 12h2|M10 12h10|M4 18h12|M16 18h4|M14 4v4|M6 10v4|M16 16v4',
  gauge: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z|M12 12l4-4|M4.5 18a9 9 0 1 1 15 0',
  lock: 'M5 11h14v9H5z|M8 11V8a4 4 0 0 1 8 0v3',
  zap: 'M13 2 4 14h6l-1 8 9-12h-6l1-8Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z|M12 7v5l3 2',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5|M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  dot: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0',
  sun: 'M12 4V2|M12 22v-2|M4.93 4.93 6.34 6.34|M17.66 17.66l1.41 1.41|M2 12h2|M20 12h2|M6.34 17.66 4.93 19.07|M19.07 4.93l-1.41 1.41|M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
};

function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.6 }: { name: string; size?: number; color?: string; strokeWidth?: number }) {
  const d = ICONS[name] || ICONS.dot;
  const paths = d.split('|');
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block' }}>
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

function MonadMark({ size = 24, color = 'var(--monad-purple)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="2" transform="rotate(45 12 12)"
        fill="none" stroke={color} strokeWidth="1.8" />
      <rect x="8.2" y="8.2" width="7.6" height="7.6" rx="1" transform="rotate(45 12 12)"
        fill={color} opacity="0.9" />
    </svg>
  );
}

// ── Atomic components ─────────────────────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; icon: string }> = {
  claude: { label: 'Claude Code', icon: 'zap' },
  cli: { label: 'CLI', icon: 'terminal' },
  web: { label: 'Web', icon: 'globe' },
};

function SourceTag({ source, dim }: { source: string; dim?: boolean }) {
  const m = SOURCE_META[source] || SOURCE_META.web;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: dim ? 'var(--fg-dim)' : 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
      <Icon name={m.icon} size={14} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
    </span>
  );
}

const DECISION_META: Record<Decision, { c: string; bg: string; icon: string }> = {
  ALLOW: { c: 'var(--allow)', bg: 'var(--allow-bg)', icon: 'check' },
  BLOCK: { c: 'var(--block)', bg: 'var(--block-bg)', icon: 'x' },
  'REQUIRE APPROVAL': { c: 'var(--approve)', bg: 'var(--approve-bg)', icon: 'alert' },
};

function DecisionBadge({ decision, size = 'md' }: { decision: Decision; size?: 'sm' | 'md' }) {
  const m = DECISION_META[decision];
  return (
    <span className="badge-track" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: size === 'sm' ? '3px 8px' : '5px 11px',
      fontSize: size === 'sm' ? 10 : 11, fontWeight: 700, letterSpacing: '0.12em',
      color: m.c, background: m.bg, border: `1px solid ${m.c}`,
      borderRadius: 'var(--r-sm)', whiteSpace: 'nowrap',
    }}>
      <Icon name={m.icon} size={size === 'sm' ? 11 : 12} strokeWidth={2.2} color={m.c} />
      {decision}
    </span>
  );
}

function riskColor(r: number) {
  if (r >= 70) return 'var(--block)';
  if (r >= 40) return 'var(--approve)';
  return 'var(--allow)';
}

function RiskPill({ risk }: { risk: number }) {
  const c = riskColor(risk);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 44, height: 4, background: 'var(--surface-3)', borderRadius: 0, overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', height: '100%', width: `${risk}%`, background: c }} />
      </span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: c, minWidth: 18 }}>{risk}</span>
    </span>
  );
}

function RiskGauge({ value, size = 150 }: { value: number; size?: number }) {
  const c = riskColor(value);
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const polar = (ang: number): [number, number] => {
    const a = (ang - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const arcPath = (fromAng: number, toAng: number) => {
    const [x1, y1] = polar(fromAng);
    const [x2, y2] = polar(toAng);
    const large = (toAng - fromAng) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const start = 135, sweep = 270;
  const valAng = start + sweep * (value / 100);
  const label = value >= 70 ? 'HIGH RISK' : value >= 40 ? 'ELEVATED' : 'LOW RISK';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <path d={arcPath(start, start + sweep)} fill="none" stroke="var(--surface-3)" strokeWidth="10" strokeLinecap="round" />
        <path d={arcPath(start, valAng)} fill="none" stroke={c} strokeWidth="10" strokeLinecap="round" />
        {([0, 40, 70, 100] as number[]).map((t) => {
          const a = start + sweep * (t / 100);
          const aa = (a - 90) * Math.PI / 180;
          const tx = cx + (r + 11) * Math.cos(aa), ty = cy + (r + 11) * Math.sin(aa);
          return <circle key={t} cx={tx} cy={ty} r="1.5" fill="var(--fg-dim)" />;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mono" style={{ fontSize: size * 0.3, fontWeight: 700, color: c, lineHeight: 1 }}>{value}</div>
        <div className="badge-track" style={{ fontSize: 10, fontWeight: 700, color: c, marginTop: 8 }}>{label}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, accent, icon, sub }: { label: string; value: string | number; delta?: string; accent?: string; icon?: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 'var(--s3)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="label">{label}</div>
        {icon && <Icon name={icon} size={17} color={accent || 'var(--monad-purple)'} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
        <span className="mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--fg-strong)', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</span>
        {sub && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-muted)' }}>{sub}</span>}
      </div>
      {delta && <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, color: 'var(--fg-dim)', letterSpacing: '0.04em' }}>{delta}</div>}
    </div>
  );
}

// ── Brand / Header ────────────────────────────────────────────────────────────

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, border: '1px solid var(--rule-violet)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
        <MonadMark size={19} />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--fg-strong)', letterSpacing: '-0.01em', lineHeight: 1 }}>Compass</div>
        <div className="badge-track" style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--monad-purple-bright)', marginTop: 3 }}>MCP SECURITY PROXY</div>
      </div>
    </div>
  );
}

function TopStatStrip({ events }: { events: EventItem[] }) {
  const items = [
    { label: 'PROCESSED', value: STATS.processed.toLocaleString(), c: 'var(--fg)' },
    { label: 'BLOCKED', value: String(STATS.blocked), c: 'var(--block)' },
    { label: 'AVG RISK', value: String(STATS.avgRisk), c: 'var(--allow)' },
    { label: 'SESSION', value: String(events.length), c: 'var(--monad-purple-bright)' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {items.map((it, i) => (
        <div key={it.label} style={{ padding: '0 18px', borderLeft: i ? '1px solid var(--rule)' : 'none' }}>
          <div className="label" style={{ fontSize: 8.5 }}>{it.label}</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: it.c, marginTop: 3, lineHeight: 1 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function NetworkSelector() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} style={{
        all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 14px', border: '1px solid var(--rule-violet)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)',
      }}>
        <MonadMark size={16} />
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.1 }}>{STATS.network}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>Chain ID {STATS.chainId}</div>
        </div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--allow)', boxShadow: '0 0 6px var(--allow)', marginLeft: 4 }} />
        <Icon name="chevronDown" size={14} color="var(--fg-dim)" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: 240, background: 'var(--surface-2)', border: '1px solid var(--rule-strong)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-float)', zIndex: 31, overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-3)', borderBottom: '1px solid var(--rule)' }}>
              <MonadMark size={16} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)' }}>{STATS.network}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--allow)' }}>connected · block {STATS.blockHeight}</div>
              </div>
            </div>
            {['Monad Mainnet', 'Monad Devnet'].map((n) => (
              <div key={n} style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--fg-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--rule)' }}>
                {n} <span className="mono" style={{ fontSize: 10 }}>unavailable</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Audit components ──────────────────────────────────────────────────────────

function AuditRow({ ev, active, onClick, isNew }: { ev: EventItem; active: boolean; onClick: () => void; isNew: boolean }) {
  const m = DECISION_META[ev.decision];
  return (
    <button
      onClick={onClick}
      className={isNew ? 'feed-in' : ''}
      style={{
        all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
        borderBottom: '1px solid var(--rule)', padding: '16px 20px',
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `2px solid ${active ? m.c : 'transparent'}`,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--hover)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 96, flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600 }}>{ev.ago}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', marginTop: 3 }}>{ev.id}</div>
        </div>
        <div style={{ width: 122, flexShrink: 0 }}>
          <SourceTag source={ev.source} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: 'var(--fg)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.intent}</div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>→ {ev.action}</div>
        </div>
        <div style={{ width: 78, flexShrink: 0 }}>
          <RiskPill risk={ev.risk} />
        </div>
        <div style={{ width: 168, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <DecisionBadge decision={ev.decision} size="sm" />
          <Icon name="chevronRight" size={16} color="var(--fg-dim)" />
        </div>
      </div>
    </button>
  );
}

function AuditView({ events, selected, onSelect, dense }: { events: EventItem[]; selected: EventItem | null; onSelect: (e: EventItem) => void; dense: boolean }) {
  const [filter, setFilter] = useState<'ALL' | Decision>('ALL');
  const filters: ('ALL' | Decision)[] = ['ALL', 'ALLOW', 'REQUIRE APPROVAL', 'BLOCK'];
  const shown = filter === 'ALL' ? events : events.filter((e) => e.decision === filter);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--allow)', animation: 'pulseDot 1.8s infinite', boxShadow: '0 0 8px var(--allow)' }} />
            <span className="label" style={{ color: 'var(--fg-muted)' }}>LIVE AUDIT TRAIL</span>
          </div>
          <span style={{ color: 'var(--fg-dim)', fontSize: 12 }}>·</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{events.length} events</span>
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          {filters.map((f) => {
            const meta = f !== 'ALL' ? DECISION_META[f] : null;
            const on = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                all: 'unset', cursor: 'pointer', padding: '7px 13px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
                color: on ? (meta ? meta.c : 'var(--fg-strong)') : 'var(--fg-dim)',
                background: on ? 'var(--surface-2)' : 'transparent',
                borderRight: f === 'BLOCK' ? 'none' : '1px solid var(--rule)',
              }}>{f === 'REQUIRE APPROVAL' ? 'APPROVAL' : f}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 22px', borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', background: 'var(--bg-grid)', flexShrink: 0 }}>
        <div className="label" style={{ width: 94, fontSize: 9.5 }}>TIME · ID</div>
        <div className="label" style={{ width: 122, fontSize: 9.5 }}>SOURCE</div>
        <div className="label" style={{ flex: 1, fontSize: 9.5 }}>INTENT → ACTION</div>
        <div className="label" style={{ width: 78, fontSize: 9.5 }}>RISK</div>
        <div className="label" style={{ width: 168, fontSize: 9.5, textAlign: 'right' }}>DECISION</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {shown.map((ev) => (
          <AuditRow key={ev.id} ev={ev} active={selected?.id === ev.id} onClick={() => onSelect(ev)} isNew={ev._new ?? false} />
        ))}
        {shown.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-dim)', fontSize: 13 }}>No events match this filter.</div>}
      </div>
    </div>
  );
}

// ── Deep-dive drawer ──────────────────────────────────────────────────────────

function BalanceSim({ deltas }: { deltas: Delta[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--rule)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      {deltas.map((d, i) => {
        const isOut = d.amount < 0;
        const isZero = d.amount === 0;
        const c = isZero ? 'var(--fg-muted)' : isOut ? 'var(--out)' : 'var(--in)';
        const sign = isZero ? '' : isOut ? '−' : '+';
        const mag = Math.abs(d.amount);
        const amtStr = mag === 0 ? (d.note || '0') : `${sign}${mag} ${d.token}`;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--inset)', padding: '13px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, background: c, borderRadius: '50%', display: 'inline-block', boxShadow: isZero ? 'none' : `0 0 8px ${c}` }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{d.gas ? 'Network fee' : d.token === '—' ? 'Asset scope' : d.token}</span>
              {d.gas && <span className="label" style={{ fontSize: 9 }}>GAS</span>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, whiteSpace: 'nowrap' }}>
              <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: c }}>{amtStr}</div>
              {!isZero && d.usd != null && <div className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>{d.usd < 0 ? '−' : '+'}${Math.abs(d.usd).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheckRow({ c }: { c: Check }) {
  const isBool = typeof c.v === 'boolean';
  let color = 'var(--fg-muted)', icon = 'dot', iconColor = 'var(--fg-dim)';
  if (c.bad) { color = 'var(--block)'; icon = 'x'; iconColor = 'var(--block)'; }
  else if (c.warn) { color = 'var(--approve)'; icon = 'alert'; iconColor = 'var(--approve)'; }
  else if (c.good || (isBool && c.v === true)) { color = 'var(--allow)'; icon = 'check'; iconColor = 'var(--allow)'; }
  else if (isBool && c.v === false) { icon = 'check'; iconColor = 'var(--allow)'; color = 'var(--fg-muted)'; }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name={icon} size={15} color={iconColor} strokeWidth={2.2} />
        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{c.k}</span>
      </div>
      {!isBool && <span className="mono" style={{ fontSize: 12, fontWeight: 600, color }}>{String(c.v)}</span>}
    </div>
  );
}

function DeepDive({ ev, onClose }: { ev: EventItem | null; onClose: () => void }) {
  if (!ev) return null;
  const m = DECISION_META[ev.decision];
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--scrim)', zIndex: 40 }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(560px, 92%)', zIndex: 50,
        background: 'var(--surface)', borderLeft: '1px solid var(--rule-strong)',
        boxShadow: 'var(--shadow-float)', overflowY: 'auto', animation: 'drawerIn 0.28s cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--surface)', borderBottom: '1px solid var(--rule)', padding: '20px 24px', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>DECISION DEEP-DIVE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DecisionBadge decision={ev.decision} />
                <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{ev.id}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', padding: 6, display: 'flex', color: 'var(--fg-muted)' }}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className="mono" style={{ fontSize: 11.5, color: 'var(--fg-dim)', marginTop: 12, display: 'flex', gap: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={12} color="var(--fg-dim)" />{ev.ts}</span>
            <SourceTag source={ev.source} dim />
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* policy verdict */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: m.bg, border: `1px solid ${m.c}`, borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 24 }}>
            <Icon name={ev.policyType === 'block' ? 'lock' : ev.policyType === 'approve' ? 'alert' : 'shieldCheck'} size={20} color={m.c} />
            <div>
              <div className="label" style={{ color: m.c, marginBottom: 4 }}>POLICY MATCH</div>
              <div style={{ fontSize: 14, color: 'var(--fg)', fontWeight: 600, lineHeight: 1.4 }}>{ev.policy}</div>
            </div>
          </div>

          {/* intent → action */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div className="label" style={{ marginBottom: 5 }}>INTENT · NATURAL LANGUAGE</div>
              <div style={{ fontSize: 14, color: 'var(--fg)', fontWeight: 500, lineHeight: 1.35 }}>"{ev.intent}"</div>
            </div>
            <Icon name="arrowRight" size={20} color="var(--monad-purple)" />
            <div>
              <div className="label" style={{ marginBottom: 5 }}>ACTION · DETECTED CALL</div>
              <div className="mono" style={{ fontSize: 13, color: 'var(--monad-purple-bright)', fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word' }}>{ev.action}</div>
            </div>
          </div>

          {/* balance simulation */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="activity" size={15} color="var(--monad-purple)" />
              <div className="label" style={{ color: 'var(--fg-muted)' }}>SIMULATED BALANCE DELTAS</div>
            </div>
            <BalanceSim deltas={ev.deltas} />
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', marginTop: 8 }}>Pre-flight simulation · not broadcast</div>
          </div>

          {/* risk gauge */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center', background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 20, marginBottom: 24 }}>
            <RiskGauge value={ev.risk} size={150} />
            <div>
              <div className="label" style={{ marginBottom: 10 }}>RISK ENGINE CHECKS</div>
              {ev.checks.map((c, i) => <CheckRow key={i} c={c} />)}
            </div>
          </div>

          {/* raw params */}
          <div>
            <div className="label" style={{ marginBottom: 10 }}>TRANSACTION PARAMETERS</div>
            <div style={{ background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: '14px 16px' }}>
              {Object.entries(ev.params).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '6px 0' }}>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--fg-dim)' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--fg)', textAlign: 'right', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Overview view ─────────────────────────────────────────────────────────────

function ProxyDiagram() {
  const Node = ({ title, sub, accent, icon, active }: { title: string; sub: string; accent?: boolean; icon: string; active?: boolean }) => (
    <div style={{ flex: 1, background: 'var(--inset)', border: `1px solid ${accent ? 'var(--rule-violet)' : 'var(--rule)'}`, borderRadius: 'var(--r-md)', padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
      {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--monad-purple)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name={icon} size={18} color={accent ? 'var(--monad-purple)' : 'var(--fg-muted)'} />
        <div className="label" style={{ color: accent ? 'var(--monad-purple-bright)' : 'var(--fg-muted)' }}>{title}</div>
      </div>
      <div className="mono" style={{ fontSize: 12.5, color: 'var(--fg)', marginTop: 10 }}>{sub}</div>
      {active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--allow)', animation: 'pulseDot 1.8s infinite' }} />
          <span className="badge-track" style={{ fontSize: 9, fontWeight: 700, color: 'var(--allow)' }}>ACTIVE</span>
        </div>
      )}
    </div>
  );
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="label">SECURITY PROXY TOPOLOGY</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--allow)', boxShadow: '0 0 8px var(--allow)', animation: 'pulseDot 1.8s infinite' }} />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--allow)', fontWeight: 600 }}>uptime {STATS.uptime}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
        <Node title="AGENT" sub="Claude · CLI · Web" icon="zap" />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--monad-purple)' }}>
          <Icon name="arrowRight" size={18} color="var(--monad-purple)" />
        </div>
        <Node title="COMPASS PROXY" sub={STATS.proxyName} icon="shieldCheck" accent active />
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--monad-purple)' }}>
          <Icon name="arrowRight" size={18} color="var(--monad-purple)" />
        </div>
        <Node title="UPSTREAM" sub={STATS.upstream} icon="link" />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--rule)' }}>
        {[
          { label: 'INTERCEPT MODE', value: 'MCP · inline authorization' },
          { label: 'NETWORK', value: `${STATS.network} · ${STATS.chainId}` },
          { label: 'AUTONOMY', value: 'GUARDED', c: 'var(--monad-purple-bright)' },
        ].map((it) => (
          <div key={it.label} style={{ flex: 1 }}>
            <div className="label" style={{ fontSize: 9.5 }}>{it.label}</div>
            <div style={{ fontSize: 13, color: it.c || 'var(--fg)', fontWeight: 600, marginTop: 5 }}>{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniFeed({ events, onSelect, onSeeAll }: { events: EventItem[]; onSelect: (e: EventItem) => void; onSeeAll: () => void }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--rule)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--allow)', animation: 'pulseDot 1.8s infinite' }} />
          <div className="label" style={{ color: 'var(--fg-muted)' }}>RECENT DECISIONS</div>
        </div>
        <button onClick={onSeeAll} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--monad-purple-bright)' }}>
          View audit trail <Icon name="arrowRight" size={13} color="var(--monad-purple-bright)" />
        </button>
      </div>
      <div>
        {events.slice(0, 6).map((ev) => (
          <button key={ev.id} onClick={() => onSelect(ev)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, width: '100%', boxSizing: 'border-box', padding: '12px 20px', borderBottom: '1px solid var(--rule)' }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'var(--hover)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)', width: 64, flexShrink: 0 }}>{ev.ago}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.intent}</span>
            <DecisionBadge decision={ev.decision} size="sm" />
          </button>
        ))}
      </div>
    </div>
  );
}

function RiskDistribution({ events }: { events: EventItem[] }) {
  const total = events.length;
  const counts = {
    ALLOW: events.filter((e) => e.decision === 'ALLOW').length,
    'REQUIRE APPROVAL': events.filter((e) => e.decision === 'REQUIRE APPROVAL').length,
    BLOCK: events.filter((e) => e.decision === 'BLOCK').length,
  };
  const rows: { k: Decision; c: string }[] = [
    { k: 'ALLOW', c: 'var(--allow)' },
    { k: 'REQUIRE APPROVAL', c: 'var(--approve)' },
    { k: 'BLOCK', c: 'var(--block)' },
  ];
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
      <div className="label" style={{ marginBottom: 18 }}>DECISION DISTRIBUTION · SESSION</div>
      <div style={{ display: 'flex', height: 10, overflow: 'hidden', gap: 2, marginBottom: 20 }}>
        {rows.map((r) => <div key={r.k} style={{ width: `${(counts[r.k] / total) * 100}%`, background: r.c }} />)}
      </div>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 9, height: 9, background: r.c, display: 'inline-block' }} />
            <span className="badge-track" style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-muted)' }}>{r.k}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: r.c }}>{counts[r.k]}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{Math.round((counts[r.k] / total) * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewView({ events, onSelect, onSeeAll }: { events: EventItem[]; onSelect: (e: EventItem) => void; onSeeAll: () => void }) {
  return (
    <div style={{ padding: '4px 28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="Transactions Processed" value={STATS.processed.toLocaleString()} delta={STATS.processedDelta} accent="var(--monad-purple)" icon="activity" />
        <StatCard label="Threats Blocked" value={STATS.blocked} delta={STATS.blockedDelta} accent="var(--block)" icon="shield" />
        <StatCard label="Avg Agent Risk" value={STATS.avgRisk} sub="/ 100" delta="LOW · trending stable" accent="var(--allow)" icon="gauge" />
        <StatCard label="Required Approval" value={STATS.requireApproval} delta="awaiting human in policy" accent="var(--approve)" icon="alert" />
      </div>
      <div style={{ marginBottom: 16 }}>
        <ProxyDiagram />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
        <MiniFeed events={events} onSelect={onSelect} onSeeAll={onSeeAll} />
        <RiskDistribution events={events} />
      </div>
    </div>
  );
}

// ── Policies view ─────────────────────────────────────────────────────────────

function jsonToLines(obj: Record<string, unknown>, indent = 0): { pad: string; key: string | null; val: string }[] {
  const pad = '  '.repeat(indent);
  const lines: { pad: string; key: string | null; val: string }[] = [];
  const entries = Object.entries(obj);
  entries.forEach(([k, v], idx) => {
    const comma = idx < entries.length - 1 ? ',' : '';
    if (Array.isArray(v)) {
      lines.push({ pad, key: k, val: '[' });
      v.forEach((item, i) => lines.push({ pad: pad + '  ', key: null, val: `"${item}"${i < v.length - 1 ? ',' : ''}` }));
      lines.push({ pad, key: null, val: ']' + comma });
    } else if (v !== null && typeof v === 'object') {
      lines.push({ pad, key: k, val: '{' });
      jsonToLines(v as Record<string, unknown>, indent + 1).forEach((l) => lines.push(l));
      lines.push({ pad, key: null, val: '}' + comma });
    } else {
      const val = typeof v === 'string' ? `"${v}"` : String(v);
      lines.push({ pad, key: k, val: val + comma });
    }
  });
  return lines;
}

function PolicyCard({ p, open, onToggle }: { p: Policy; open: boolean; onToggle: () => void }) {
  const kindColor = p.kind === 'Risk rule' ? 'var(--block)' : p.kind === 'Allowlist' ? 'var(--allow)' : p.kind === 'Mode' ? 'var(--monad-purple)' : 'var(--approve)';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', boxSizing: 'border-box', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.enabled ? 'var(--allow)' : 'var(--fg-dim)', boxShadow: p.enabled ? '0 0 6px var(--allow)' : 'none' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-strong)' }}>{p.name}</span>
            <span className="badge-track" style={{ fontSize: 9, fontWeight: 700, color: kindColor, border: `1px solid ${kindColor}`, padding: '2px 7px', borderRadius: 'var(--r-sm)' }}>{p.kind}</span>
          </div>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} color="var(--fg-dim)" />
        </div>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)', marginTop: 10, marginLeft: 21 }}>{p.summary}</div>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--rule)', background: 'var(--inset)', padding: '16px 20px' }}>
          <div className="label" style={{ marginBottom: 10, fontSize: 9.5 }}>POLICY DEFINITION · JSON</div>
          <pre className="mono" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: 'var(--fg-muted)', whiteSpace: 'pre-wrap' }}>
            <span style={{ color: 'var(--fg-dim)' }}>{'{'}</span>{'\n'}
            {jsonToLines(p.json, 1).map((l, i) => (
              <span key={i}>
                {l.pad}
                {l.key && <span style={{ color: 'var(--monad-purple-bright)' }}>"{l.key}"</span>}
                {l.key && <span style={{ color: 'var(--fg-dim)' }}>: </span>}
                <span style={{ color: l.val.includes('"') ? 'var(--allow)' : 'var(--fg)' }}>{l.val}</span>{'\n'}
              </span>
            ))}
            <span style={{ color: 'var(--fg-dim)' }}>{'}'}</span>
          </pre>
        </div>
      )}
    </div>
  );
}

function PoliciesView({ delegations }: { delegations: Delegation[] }) {
  const [open, setOpen] = useState<string | null>(POLICIES[0].id);
  const [revoked, setRevoked] = useState<string[]>([]);
  return (
    <div style={{ padding: '4px 28px 32px', overflowY: 'auto', height: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="label" style={{ color: 'var(--fg-muted)' }}>POLICY MANAGER · {POLICIES.length} RULES</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--fg-dim)' }}>
              <Icon name="code" size={13} color="var(--fg-dim)" /> read-only view
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {POLICIES.map((p) => <PolicyCard key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} />)}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* delegations */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon name="lock" size={16} color="var(--monad-purple)" />
              <div className="label" style={{ color: 'var(--fg-muted)' }}>DELEGATED ACCESS</div>
            </div>
            {delegations.map((d) => {
              const isRevoked = revoked.includes(d.id);
              return (
                <div key={d.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: isRevoked ? 0.5 : 1 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="mono" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-strong)' }}>{d.grantee}</span>
                      <span className="badge-track" style={{ fontSize: 9, fontWeight: 700, color: isRevoked ? 'var(--fg-dim)' : 'var(--allow)', border: `1px solid ${isRevoked ? 'var(--fg-dim)' : 'var(--allow)'}`, padding: '2px 7px' }}>{isRevoked ? 'REVOKED' : 'ACTIVE'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 6 }}>{d.scope}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', marginTop: 4 }}>granted {d.granted} · expires {d.expires}</div>
                  </div>
                  <button onClick={() => setRevoked((r) => [...r, d.id])} disabled={isRevoked} style={{
                    all: 'unset', cursor: isRevoked ? 'default' : 'pointer', flexShrink: 0,
                    padding: '8px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                    color: isRevoked ? 'var(--fg-dim)' : 'var(--block)',
                    border: `1px solid ${isRevoked ? 'var(--rule)' : 'var(--block)'}`, borderRadius: 'var(--r-sm)',
                    background: isRevoked ? 'transparent' : 'var(--block-bg)',
                  }}>{isRevoked ? 'REVOKED' : 'REVOKE'}</button>
                </div>
              );
            })}
          </div>
          {/* emergency control */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--rule-violet)', borderRadius: 'var(--r-md)', padding: 'var(--s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Icon name="shieldCheck" size={16} color="var(--monad-purple)" />
              <div className="label" style={{ color: 'var(--monad-purple-bright)' }}>EMERGENCY CONTROL</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5, marginBottom: 16 }}>Instantly revoke all delegated access. The agent drops to observe-only until re-authorized.</div>
            <button onClick={() => setRevoked(delegations.map((d) => d.id))} style={{
              all: 'unset', cursor: 'pointer', display: 'block', textAlign: 'center', boxSizing: 'border-box', width: '100%',
              padding: 12, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              color: 'var(--block)', border: '1px solid var(--block)', background: 'var(--block-bg)', borderRadius: 'var(--r-sm)',
            }}>REVOKE ALL · KILL SWITCH</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tweaks panel ──────────────────────────────────────────────────────────────

function TweaksPanel({ theme, onToggleTheme }: { theme: 'Light' | 'Dark'; onToggleTheme: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen((o) => !o)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 60,
        all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: 44, borderRadius: '50%',
        background: 'var(--monad-purple)', boxShadow: '0 4px 16px rgba(131,110,249,0.5)',
        color: '#fff',
      }}>
        <Icon name={theme === 'Dark' ? 'sun' : 'moon'} size={20} color="#fff" />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 58 }} />
          <div style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 59, background: 'var(--surface)', border: '1px solid var(--rule-strong)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-float)', padding: '16px 20px', minWidth: 200 }}>
            <div className="label" style={{ marginBottom: 12 }}>APPEARANCE</div>
            <button onClick={() => { onToggleTheme(); setOpen(false); }} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)',
            }}>
              <Icon name={theme === 'Dark' ? 'sun' : 'moon'} size={16} color="var(--monad-purple)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Switch to {theme === 'Dark' ? 'Light' : 'Dark'} Mode</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bumpAgo(ago: string): string {
  if (ago === 'just now') return '30s ago';
  const m = ago.match(/(\d+)s ago/);
  if (m) { const s = +m[1] + 30; return s >= 60 ? '1m ago' : `${s}s ago`; }
  const mm = ago.match(/(\d+)m ago/);
  if (mm) return `${+mm[1] + 1}m ago`;
  return ago;
}

// ── App shell ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'layers' },
  { id: 'audit', label: 'Audit Trail', icon: 'list' },
  { id: 'policies', label: 'Policies', icon: 'sliders' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('overview');
  const [events, setEvents] = useState<EventItem[]>(SEED_EVENTS);
  const [selected, setSelected] = useState<EventItem | null>(SEED_EVENTS[0]);
  const [theme, setTheme] = useState<'Light' | 'Dark'>('Light');
  const incomingRef = useRef(0);

  useEffect(() => {
    if (theme === 'Dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }, [theme]);

  useEffect(() => {
    const id = setInterval(() => {
      const tmpl = INCOMING_TEMPLATES[incomingRef.current % INCOMING_TEMPLATES.length];
      incomingRef.current += 1;
      const n = incomingRef.current;
      const ev: EventItem = {
        ...tmpl,
        id: `EVT-LIVE-${n}`,
        ts: `2026-05-30 14:${String(22 + n).padStart(2, '0')}:0${n % 9}`,
        ago: 'just now',
        _new: true,
      };
      setEvents((prev) => {
        const aged = prev.map((p) => ({ ...p, _new: false, ago: bumpAgo(p.ago) }));
        return [ev, ...aged].slice(0, 40);
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const dense = false;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ flexShrink: 0, borderBottom: '1px solid var(--rule)', background: 'var(--surface)', padding: '0 28px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Brand />
          <TopStatStrip events={events} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <NetworkSelector />
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--rule)', background: 'var(--bg-grid)', padding: '0 28px', display: 'flex', gap: 4 }}>
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
              padding: '16px 16px 14px', borderBottom: `2px solid ${on ? 'var(--monad-purple)' : 'transparent'}`,
              color: on ? 'var(--fg-strong)' : 'var(--fg-muted)', marginBottom: -1,
            }}>
              <Icon name={tb.icon} size={16} color={on ? 'var(--monad-purple-bright)' : 'var(--fg-muted)'} />
              <span style={{ fontSize: 13.5, fontWeight: on ? 600 : 500 }}>{tb.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', paddingTop: tab === 'audit' ? 0 : 24, paddingLeft: tab === 'audit' ? 28 : 0, paddingRight: tab === 'audit' ? 28 : 0, paddingBottom: tab === 'audit' ? 28 : 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {tab === 'overview' && <OverviewView events={events} onSelect={(e) => { setSelected(e); setTab('audit'); }} onSeeAll={() => setTab('audit')} />}
        {tab === 'audit' && <AuditView events={events} selected={selected} onSelect={setSelected} dense={dense} />}
        {tab === 'policies' && <PoliciesView delegations={DELEGATIONS} />}

        {tab === 'audit' && <DeepDive ev={selected} onClose={() => setSelected(null)} />}
      </main>

      <TweaksPanel theme={theme} onToggleTheme={() => setTheme((t) => (t === 'Light' ? 'Dark' : 'Light'))} />
    </div>
  );
}
