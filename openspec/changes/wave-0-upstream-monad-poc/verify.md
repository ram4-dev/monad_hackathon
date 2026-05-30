# SDD Verify Report: `wave-0-upstream-monad-poc`

Verified at: `2026-05-30`  
Final verdict: `pass_with_blockers`  
Strict TDD: `not_active` (`openspec/config.yaml` has `strict_tdd: false`, `test_runner: null`)

## Executive summary

W0 stayed within the accepted evidence/docs boundary: the working tree changes are only under `openspec/`, and no application/runtime source files are modified. The W0 package correctly identifies Wallet Agent upstream as `https://github.com/wallet-agent/wallet-agent` and records the command shape `bunx wallet-agent@latest`.

Public Monad Testnet RPC evidence supports `chain_id=10143` (`0x279f`) for the selected provider label `quicknode-public` and fallback labels `ankr-public` / `monadinfra-public`; re-verification also returned `10143` for all three public providers. Wallet Agent `tools/list`, schemas/hashes, Monad chain setup, native read PoC, and simulation PoC are now captured. Remaining missing evidence is explicitly mapped to open blockers: mutation consent skip, host no-bypass proof, longer provider smoke, and absent `dry_run_transaction`.

No external mutation/signing/broadcast/write evidence was found; all mutation-like paths are skipped by consent gate. All JSON/JSONL evidence artifacts parsed successfully. Secret-safety scan over the W0 evidence directory found no high-risk secret patterns or credentialed provider URLs.

One review-workload warning remains: the actual untracked OpenSpec footprint is about `3,985` lines across `60` files after adding verify artifacts (pre-verify W0 apply footprint was `3,433` lines across `58` files), which is substantially above the `tasks.md` forecast of `~250-700` evidence/docs lines. The user selected no fixed line cap for this session, so this is not a hard budget violation and not scope creep into runtime code, but reviewers should still triage review expectations.

## Inputs read

- `openspec/config.yaml`
- `openspec/changes/wave-0-upstream-monad-poc/proposal.md`
- `openspec/changes/wave-0-upstream-monad-poc/design.md`
- `openspec/changes/wave-0-upstream-monad-poc/tasks.md`
- `openspec/changes/wave-0-upstream-monad-poc/apply-progress.md`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/verify-report.md`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/blockers/blocker-register.md`
- all `openspec/changes/wave-0-upstream-monad-poc/specs/**/spec.md`
- W0 evidence JSON/JSONL/MD artifacts under `openspec/changes/wave-0-upstream-monad-poc/evidence/**`
- injected skill: `.agents/skills/monad-development/SKILL.md`

## Spec coverage

| Capability/spec                   | Verify status             | Evidence / blockers                                                                                                                                                                                            |
| --------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallet-agent-upstream-discovery` | `pass_with_followup`      | Upstream URL and `bunx wallet-agent@latest` present; live `tools/list` captured using public npm registry override; `dry_run_transaction` absent with `W0-BLOCKER-009`.                                        |
| `monad-testnet-chain-validation`  | `pass`                    | Public RPC confirms `0x279f`/`10143`; Wallet Agent `add_custom_chain` and `switch_chain` succeeded for Monad Testnet/MON.                                                                                      |
| `monad-rpc-provider-evidence`     | `pass_with_followup`      | Selected/fallback provider labels recorded without secrets; official caveats cited; longer reliability/rate-limit smoke is `W0-BLOCKER-008`.                                                                   |
| `wallet-agent-read-poc`           | `pass_with_optional_skip` | `get_wallet_info` and `get_balance` passed with a mock account; `get_token_balance` remains optional/skipped until a safe token is provided.                                                                   |
| `wallet-agent-simulation-poc`     | `pass_with_followup`      | Wallet Agent `simulate_transaction` produced inspectable non-mutating evidence; `estimate_gas` reached Monad and returned a reserve-balance caveat; `dry_run_transaction` remains absent via `W0-BLOCKER-009`. |
| `external-mutation-consent-gate`  | `pass`                    | `mutation-consent-records.jsonl` has 0 records; `mutation-skips.jsonl` has 8 skipped/not-granted records.                                                                                                      |
| `upstream-blocker-register`       | `pass`                    | Blocker register records `W0-BLOCKER-001`/`002` as resolved and keeps open blockers explicit, including `W0-BLOCKER-009`.                                                                                      |
| `mcp-host-no-bypass-evidence`     | `blocked_recorded`        | Boundary statement present; safe host proof unavailable and mapped to `W0-BLOCKER-007`.                                                                                                                        |

## Task / apply / verify consistency

- `apply-progress.md` and `evidence/verify-report.md` agree on overall `pass_with_blockers`.
- Top-level `tasks.md` tasks are marked complete and the `Apply Results` section records `pass_with_blockers`.
- Current missing evidence is consistently mapped to open blockers `W0-BLOCKER-006` through `W0-BLOCKER-009`; `W0-BLOCKER-001` through `005` are resolved.
- Documentation note: `tasks.md` now states that task heading checkboxes are completion status, while nested checkboxes remain the original planned substep checklist and may stay unchecked when the substep was skipped, blocked, or satisfied by blocker/evidence references.

## Safety and mutation verification

- No `.env`, private keys, tokens, credentials, shell history, host MCP config, or secret-manager outputs were read during verification.
- Verification only scanned W0 evidence/artifact files for secret-safety.
- No mutation/signing/broadcast/write commands were run during verification.
- Evidence records no external mutation: consent records are empty and all write-like paths are skipped/not granted.

## Strict TDD and assertion quality

Strict TDD is not active. `openspec/config.yaml` sets `strict_tdd: false` and `test_runner: null`; `apply-progress.md` also states no production code was written. No TDD evidence table or assertion-quality audit is required for this W0 evidence-only change.

## Review workload / PR boundary

- `tasks.md`: chained PRs recommended = `No`; delivery strategy = `single-pr`; application code expected = `0`.
- User delivery decision: single PR accepted for W0 evidence/docs; no app/runtime code should have changed.
- Verified boundary: `git status --short --untracked-files=all` lists only `openspec/**` files; tracked/staged diffs are empty; `NON_OPENSPEC_UNTRACKED=0`.
- Warning: actual OpenSpec footprint is `60` untracked files / `3,985` lines after adding verify artifacts (`evidence/**` 1,920; `specs/**` 590; root change docs 1,426; config 49). Pre-verify W0 apply footprint was `58` files / `3,433` lines. This exceeds the `~250-700` forecast. The session has no fixed line cap, so no `size:exception` is required, but reviewers should be warned.

## Validation commands run

### Spec/evidence inventory

```bash
find openspec/changes/wave-0-upstream-monad-poc/specs -type f -name spec.md -print | sort && printf '\nEVIDENCE\n' && find openspec/changes/wave-0-upstream-monad-poc/evidence -type f \( -name '*.json' -o -name '*.jsonl' -o -name '*.md' \) -print | sort
```

Result: found 8 spec files and W0 evidence JSON/JSONL/MD artifacts.

### Git boundary checks

```bash
git status --short && printf '\nDIFF NAME ONLY\n' && git diff --name-only && printf '\nDIFF CACHED NAME ONLY\n' && git diff --cached --name-only
```

Result: only `?? openspec/`; no tracked or staged diff.

```bash
git status --short --untracked-files=all && printf '\nUNTRACKED_ALL\n' && git ls-files --others --exclude-standard | sort && printf '\nTRACKED_MODIFIED\n' && git diff --name-only && printf '\nTRACKED_STAGED\n' && git diff --cached --name-only
```

Result: 58 untracked files, all under `openspec/`; no tracked/staged modifications.

### JSON/JSONL parse verification

```bash
python3 - <<'PY'
import json, pathlib
root=pathlib.Path('openspec/changes/wave-0-upstream-monad-poc/evidence')
for p in sorted(root.rglob('*')):
    if p.suffix == '.json':
        json.loads(p.read_text())
        print(f'JSON_OK {p}')
    elif p.suffix == '.jsonl':
        n=0
        for i,line in enumerate(p.read_text().splitlines(),1):
            if not line.strip():
                continue
            json.loads(line)
            n+=1
        print(f'JSONL_OK {p}: records={n}')
PY
```

Result: all evidence JSON/JSONL files parse successfully; blocker register has 8 records, mutation consent has 0 records, mutation skips has 8 records.

### Official Monad docs verification

```bash
python3 - <<'PY'
from urllib.request import Request, urlopen
urls = [
    'https://docs.monad.xyz/llms.txt',
    'https://docs.monad.xyz/developer-essentials/testnets.md',
    'https://docs.monad.xyz/reference/json-rpc/overview.md',
    'https://docs.monad.xyz/developer-essentials/gas-pricing.md',
    'https://docs.monad.xyz/developer-essentials/transactions.md',
    'https://docs.monad.xyz/guides/monad-mcp.md',
]
markers = {
    urls[0]: ['testnets.md', 'json-rpc', 'gas-pricing'],
    urls[1]: ['10143', 'MON', 'testnet-rpc.monad.xyz'],
    urls[2]: ['eth_getTransactionByHash', 'latest', 'eth_estimateGas'],
    urls[3]: ['EIP-1559', 'gas'],
    urls[4]: ['type 3', 'transaction'],
    urls[5]: ['MCP', 'Monad'],
}
for url in urls:
    req = Request(url, headers={'User-Agent':'compass-w0-verify/1.0'})
    text = urlopen(req, timeout=20).read().decode('utf-8', errors='replace')
    missing = [m for m in markers[url] if m.lower() not in text.lower()]
    print(f'DOC_OK {url} bytes={len(text)} markers_missing={missing}')
PY
```

Result: all six docs fetched; expected markers present.

### Public RPC chain ID re-check

```bash
python3 - <<'PY'
import json, urllib.request, time
providers = [
    ('quicknode-public','https://testnet-rpc.monad.xyz'),
    ('ankr-public','https://rpc.ankr.com/monad_testnet'),
    ('monadinfra-public','https://rpc-testnet.monadinfra.com'),
]
for label,url in providers:
    payload=json.dumps({'jsonrpc':'2.0','id':1,'method':'eth_chainId','params':[]}).encode()
    req=urllib.request.Request(url, data=payload, headers={'content-type':'application/json','user-agent':'compass-w0-verify/1.0'})
    t=time.time()
    with urllib.request.urlopen(req, timeout=15) as r:
        data=json.loads(r.read().decode('utf-8','replace'))
    result=data.get('result')
    decoded=int(result,16) if isinstance(result,str) and result.startswith('0x') else None
    print(f'RPC_OK {label} method=eth_chainId result={result} decoded={decoded} latency_ms={int((time.time()-t)*1000)}')
PY
```

Result: all three providers returned `0x279f` decoded as `10143`.

### Secret-safety scan over W0 evidence only

```bash
python3 - <<'PY'
import pathlib, re
root=pathlib.Path('openspec/changes/wave-0-upstream-monad-poc/evidence')
patterns={
    'private_key_block': re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
    'aws_access_key': re.compile(r'AKIA[0-9A-Z]{16}'),
    'github_token': re.compile(r'gh[pousr]_[A-Za-z0-9_]{30,}'),
    'openai_key': re.compile(r'sk-[A-Za-z0-9]{32,}'),
    'slack_token': re.compile(r'xox[baprs]-[A-Za-z0-9-]{20,}'),
    'jwt': re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
    'secret_assignment': re.compile(r'(?i)\b(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*["\']?([A-Za-z0-9_./+\-]{12,})'),
    'credentialed_url_query': re.compile(r'https?://[^\s)"\']*[?&](?:api[_-]?key|token|secret|signature|key)=', re.I),
}
findings=[]
for p in sorted(root.rglob('*')):
    if not p.is_file() or p.suffix.lower() not in {'.json','.jsonl','.md'}:
        continue
    text=p.read_text(errors='replace')
    for name,rx in patterns.items():
        for m in rx.finditer(text):
            findings.append((str(p), text.count('\n',0,m.start())+1, name))
print('SECRET_SCAN_FILES', sum(1 for p in root.rglob('*') if p.is_file() and p.suffix.lower() in {'.json','.jsonl','.md'}))
print('SECRET_SCAN_OK no high-risk secret patterns or credentialed provider URLs found' if not findings else findings)
PY
```

Result: `SECRET_SCAN_FILES 45`; no high-risk secret patterns or credentialed provider URLs found.

### Consent/mutation check

```bash
python3 - <<'PY'
import json, pathlib
root=pathlib.Path('openspec/changes/wave-0-upstream-monad-poc/evidence')
consent_records=[line for line in (root/'consent/mutation-consent-records.jsonl').read_text().splitlines() if line.strip()]
skips=[json.loads(line) for line in (root/'consent/mutation-skips.jsonl').read_text().splitlines() if line.strip()]
print('CONSENT_RECORDS', len(consent_records))
print('MUTATION_SKIPS', len(skips), sorted({s.get('action_type') for s in skips}))
print('ALL_SKIPPED_NOT_GRANTED', all(s.get('status')=='skipped' and s.get('consent_status')=='not_granted' for s in skips))
PY
```

Result: 0 consent records; 8 skipped/not-granted mutation-like action records.

### OpenSpec CLI availability

```bash
if command -v openspec >/dev/null 2>&1; then openspec validate wave-0-upstream-monad-poc --strict; else echo 'openspec CLI not found'; fi
```

Result: `openspec CLI not found`.

### Review workload line count

```bash
python3 - <<'PY'
import pathlib, subprocess, collections
files=[pathlib.Path(p) for p in subprocess.check_output(['git','ls-files','--others','--exclude-standard'], text=True).splitlines()]
summary=collections.Counter()
for p in files:
    if str(p).startswith('openspec/changes/wave-0-upstream-monad-poc/evidence/'):
        key='evidence/**'
    elif str(p).startswith('openspec/changes/wave-0-upstream-monad-poc/specs/'):
        key='specs/**'
    elif str(p).startswith('openspec/changes/wave-0-upstream-monad-poc/'):
        key='change-root-docs'
    elif str(p)=='openspec/config.yaml':
        key='openspec/config.yaml'
    else:
        key='other'
    summary[key]+=len(p.read_text(errors='replace').splitlines())
print(dict(summary))
PY
```

Result after adding verify artifacts: `{'change-root-docs': 1426, 'evidence/**': 1920, 'specs/**': 590, 'openspec/config.yaml': 49}` (`TOTAL_LINES=3985`).

## Exact blockers

- `W0-BLOCKER-001`: resolved — Wallet Agent MCP initialize/tools-list works when `bunx` uses `npm_config_registry=https://registry.npmjs.org/`.
- `W0-BLOCKER-002`: resolved — live sanitized fixtures and schema hashes are captured for present P0 tools.
- `W0-BLOCKER-003`: resolved — Wallet Agent `add_custom_chain` / `switch_chain` Monad Testnet flow passed.
- `W0-BLOCKER-004`: resolved — Wallet Agent `get_wallet_info` / `get_balance` read-only PoC passed with mock account.
- `W0-BLOCKER-005`: resolved — Wallet Agent simulation PoC produced inspectable non-mutating evidence; `estimate_gas` returned a reserve-balance caveat.
- `W0-BLOCKER-006`: Mutation/signature/write paths skipped because no explicit W0 consent was granted.
- `W0-BLOCKER-007`: Host no-bypass proof unavailable; requires sanitized host-visible Compass-only evidence.
- `W0-BLOCKER-008`: Provider reliability/rate-limit evidence limited to short read-only samples.
- `W0-BLOCKER-009`: Live Wallet Agent `tools/list` does not expose `dry_run_transaction`; no fake tool/hash was created.

## Next recommended

1. Keep this W0 as `pass_with_blockers`, not full success.
2. Use captured descriptors/hashes for present P0 tools in W2; handle absent `dry_run_transaction` via `W0-BLOCKER-009`.
3. Use resolved chain/read/simulation evidence for W4/W5 planning, while preserving the reserve-balance caveat and absent dry-run note.
4. Obtain sanitized host no-bypass proof before W6 demo readiness.
5. Record a reviewer note for the actual W0 artifact size before PR review.

## Standard phase envelope

- `status`: `pass_with_blockers`
- `executive_summary`: Evidence-only boundary held; public Monad Testnet RPC evidence passes for `10143`; Wallet Agent `tools/list` and schema hashes are captured after fixing bunx registry resolution; remaining Wallet Agent behavior/no-bypass evidence is explicitly blocked; no secrets or mutation found.
- `artifacts`: `openspec/changes/wave-0-upstream-monad-poc/verify.md`, `openspec/changes/wave-0-upstream-monad-poc/verify-report.md`, `/Users/rcarnicer/Desktop/hackathon/compass_monad/tmp/sdd-verify-wave0.md`
- `next_recommended`: use captured schemas for W2, resolve remaining blockers in dependency order, and add reviewer workload note.
- `risks`: unresolved Wallet Agent chain/read/simulation; absent `dry_run_transaction`; no host no-bypass proof; limited provider reliability data; review-size over forecast.
- `skill_resolution`: `paths-injected`

## Debug update — Wallet Agent bunx issue (2026-05-30T16:08:36Z)

Root cause found: local Bun/npm registry configuration resolved `wallet-agent` through a private registry, causing package fetch failure/timeout behavior. Running Wallet Agent with `npm_config_registry=https://registry.npmjs.org/` and newline-delimited JSON-RPC over stdio fixed MCP discovery. `tools/list` is now captured and schema hashes are computed for present P0 tools. `dry_run_transaction` remains absent in live `tools/list` and is tracked as `W0-BLOCKER-009`; chain/read/simulation/no-bypass blockers remain. No secrets were read and no mutation/signing/broadcast/write tools were called.

## Debug update — Monad chain/read/simulation PoC (2026-05-30T16:20:16Z)

Using the user-provided Monad Testnet data (`chainId=10143`, `name=Monad Testnet`, `symbol=MON`) and public RPC `https://testnet-rpc.monad.xyz`, Wallet Agent `add_custom_chain` and `switch_chain` succeeded. A mock-account read PoC succeeded for `get_wallet_info` and `get_balance`. `simulate_transaction` produced inspectable non-mutating failure/revert evidence; `estimate_gas` reached Monad through Wallet Agent/viem and returned a reserve-balance violation for the mock account. `W0-BLOCKER-003`, `W0-BLOCKER-004`, and `W0-BLOCKER-005` are resolved. Remaining open blockers: `W0-BLOCKER-006`, `W0-BLOCKER-007`, `W0-BLOCKER-008`, and `W0-BLOCKER-009`. No secrets were read and no signing/broadcast/transfer/approval/write was performed.
