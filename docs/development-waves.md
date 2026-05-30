# Compass Monad — waves de desarrollo

Este plan baja `docs/constitution.md` v0.6 y `compass_product_spec_monad_mcp_proxy_v0.2.md` a waves implementables. Si hay tensión entre documentos, **manda la constitución**: P0 es un **MCP security proxy** dentro de Claude/Codex/Cursor, con **Wallet Agent como MCP upstream**, Monad Testnet, registry de semántica, policy `allow|block`, digest, idempotencia y audit local append-only.

> **Actualización del modelo de policy (desde W4):** las policies dejan de ser un JSON local y pasan a vivir **on-chain en Monad Testnet como un contrato de policy por usuario** (per-user). Compass **resuelve la identidad del usuario (definida por W3), lee** su contrato de policy para decidir `allow|block`, y también **gestiona su ciclo de vida (deploy/registro/update) como acción on-chain guardada**. La evaluación es **fail-closed**: si la policy del usuario no se puede resolver/leer, se bloquea. Este cambio aplica a **W4, W5 y W6**; W0–W3 no se modifican aquí (W3 es responsable de la identidad de usuario y del shape del contrato). **Divergencia conocida:** `docs/constitution.md` §3.4 todavía describe la policy como local y deja fuera de P0 las reglas que dependen de estado on-chain; adoptar este modelo **requiere una enmienda de constitución (ADR)** que se gestiona por separado (owner de W3). Hasta que esa enmienda exista, la regla "manda la constitución" sigue vigente y este documento marca explícitamente la divergencia.

## Quick path

1. Validar Wallet Agent + Monad Testnet como upstream real.
2. Construir `compass-proxy` como MCP server frente al host y MCP client frente a Wallet Agent.
3. Filtrar `tools/list` con un registry pre-mapeado de semántica.
4. Interceptar `tools/call`: evidencia → simulación/inspección → policy → `allow|block`.
5. Forwardear al upstream solo cuando Compass decide `allow`.
6. Endurecer demo: blocked allowances, no bypass, audit, digest e idempotencia.

## Norte P0

Demo objetivo:

```text
Claude Code / Claude Desktop / Codex / Cursor
        |
        v
Compass MCP Security Proxy
  - MCP server frente al host
  - MCP client frente al upstream
  - registry-first tools/list filtering
  - guarded tools/call forwarding
        |
        v
Wallet Agent MCP upstream
        |
        v
Monad Testnet RPC
```

Reglas que condicionan todas las waves:

- El host ve **Compass**, no Wallet Agent directo.
- No hay aprobación humana/manual ni UI de approval en P0.
- `approve_token` significa allowance on-chain; se permite solo con policy explícita exacta.
- Una tool no mapeada en el registry se oculta o se bloquea antes de llegar a policy.
- Orden obligatorio: `registry -> evidencia/simulación -> policy -> allow/block`.
- Writes/signatures/broadcast requieren `candidate_tx_digest` cuando aplique.
- Toda tool que pueda hacer broadcast/execution requiere idempotencia.
- Audit local append-only y sin secretos.

## Cómo leer dependencias

- **Hard dependency:** la wave no puede cerrarse ni alimentar a la siguiente sin esa dependencia terminada.
- **Soft dependency:** la wave puede avanzar con mocks, fixtures o valores provisionales, pero debe reconciliarse antes de demo.
- **Start gate:** condición mínima para empezar trabajo útil.
- **Exit gate:** condición concreta que desbloquea waves posteriores.

## Dependency graph

```text
W0 Upstream + Monad PoC ──────────────┬─> W2 Tool semantics registry ──> W3 Policy/risk/audit ─┐
                                      │                                                        │
                                      └──────────────────────────────────────────────────────┐ │
                                                                                             v v
W1 MCP proxy skeleton + adapter ───────────────────────────────────────────────────────────> W4 Guarded forward pipeline
                                                                                             |
                                                                                             v
                                                                                         W5 Monad action coverage
                                                                                             |
                                                                                             v
                                                                                         W6 Demo hardening
```

Regla de paralelización: **W1 puede arrancar en paralelo con W0 usando un upstream mock**. W0 se vuelve hard dependency cuando una wave necesita datos reales de Wallet Agent/Monad: schema hashes, simulación real, gas/RPC y PoC de forwarding.

## Wave summary

| Wave | Name                                  | Hard dependencies                    | Soft dependencies                     | Unlocks                                                                                  |
| ---- | ------------------------------------- | ------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------- |
| W0   | Upstream + Monad PoC                  | none                                 | none                                  | Facts reales: Wallet Agent schemas, Monad RPC behavior, schema hashes y PoC constraints. |
| W1   | MCP proxy skeleton + upstream adapter | none                                 | W0 para conectar al Wallet Agent real | Proxy MCP server/client, upstream process wiring y fixtures de integración.              |
| W2   | Tool semantics registry               | W0 schema capture para versión final | W1 integration shape                  | Registry-first tool exposure, `input_schema_hash` y bloqueo de unmapped tools.           |
| W3   | Policy, risk and audit foundation     | W2 registry shape/classes            | W0 gas/RPC facts finales              | Policy `allow\|block`, safe errors, risk checks y audit append-only.                     |
| W4   | Guarded forward pipeline              | W1, W2, W3 (contrato policy on-chain) | W0 real simulation + RPC reads        | `tools/call` interception, digest, idempotency, forward/block contra policy on-chain per-user. |
| W5   | Monad action coverage                 | W0, W4                               | none                                  | P0 Wallet Agent tools seguras en Monad Testnet + ciclo de vida del contrato de policy por usuario. |
| W6   | Demo hardening and release readiness  | W5                                   | none                                  | Demo reproducible (incluye deploy/seed de policy on-chain), tests, docs y no-bypass proof. |

## Dependency contract per wave

### W0 — Upstream + Monad PoC

- **Hard dependencies:** ninguna.
- **Start gate:** repo con docs actuales y acceso local a `bunx wallet-agent@latest`.
- **Exit gate:** schemas capturados, Monad Testnet validada, RPC elegido, PoC read/simulate documentado y blockers registrados.
- **Unlocks hard:** W2 final registry, W5 real Monad action coverage.
- **Unlocks soft:** W1 real upstream integration, W3 gas/RPC policy tuning, W4 real simulation behavior.

### W1 — MCP proxy skeleton + upstream adapter

- **Hard dependencies:** ninguna para skeleton con upstream mock.
- **Soft dependencies:** W0 para reemplazar mock por Wallet Agent real.
- **Start gate:** definición de `compass-proxy` y MCP stdio transport.
- **Exit gate:** host se conecta a Compass; Compass puede llamar `tools/list` en mock/upstream; no expone tools sin registry.
- **Unlocks hard:** W4 guarded forward pipeline.
- **Can start early:** sí, siempre que use fixtures/mock y no asuma schemas reales.

### W2 — Tool semantics registry

- **Hard dependencies:** W0 schema capture para registry final.
- **Soft dependencies:** W1 para validar cómo se inyecta el filtro en `tools/list`.
- **Start gate:** fixture provisional de `tools/list` o salida real de W0.
- **Exit gate:** registry P0 con `input_schema_hash`, tests de drift y comportamiento unmapped definido.
- **Unlocks hard:** W3 policy/risk/audit y W4 guarded forwarding.
- **Can start early:** parcialmente, con entradas marcadas `unstable` hasta W0.

### W3 — Policy, risk and audit foundation

- **Hard dependencies:** W2 shape/classes del registry.
- **Soft dependencies:** W0 para gas/RPC facts finales.
- **Start gate:** tool classes y state effects definidos aunque sean provisionales.
- **Exit gate:** policy `allow|block`, risk checks y audit append-only testeados contra registry fixtures.
- **Unlocks hard:** W4 guarded forwarding.
- **Can start early:** sí, si usa fixtures de W2 y luego actualiza límites con W0.

### W4 — Guarded forward pipeline

- **Hard dependencies:** W1 + W2 + W3. De W3 en particular: el **contrato de policy on-chain per-user**, la interfaz de **identidad de usuario** y el **reader** del estado del contrato.
- **Soft dependencies:** W0 para correr simulación real contra Wallet Agent/Monad **y** facts de RPC para leer el estado del contrato de policy (`eth_call`).
- **Start gate:** proxy skeleton, registry P0 y la interfaz de policy on-chain de W3 disponibles (aunque sea contra un contrato de prueba).
- **Exit gate:** blocked calls no llegan al upstream; allowed calls forwardean exactamente una vez; digest/idempotency/audit funcionan; la decisión `allow|block` se evalúa contra el contrato de policy on-chain del usuario y es **fail-closed** si no se puede resolver/leer.
- **Unlocks hard:** W5 Monad action coverage.
- **Can start early:** solo tests unitarios con upstream mock y un mock del reader de policy on-chain; no real forwarding hasta W1/W2/W3.

### W5 — Monad action coverage

- **Hard dependencies:** W0 + W4.
- **Soft dependencies:** ninguna.
- **Start gate:** Wallet Agent + Monad PoC validado y guarded forwarding operativo (incluida la lectura de policy on-chain de W4).
- **Exit gate:** P0 tools reales cubiertas: chain management, read-only, simulation, transfer/send, token allowance y typed-data handling, **todas validadas contra la policy on-chain del usuario**; además el **ciclo de vida del contrato de policy por usuario** (deploy/registro/update) cubierto como acción on-chain guardada.
- **Unlocks hard:** W6 demo hardening.
- **Can start early:** no para comportamiento final; solo investigación/fixtures.

### W6 — Demo hardening and release readiness

- **Hard dependencies:** W5.
- **Soft dependencies:** ninguna.
- **Start gate:** P0 action coverage funcionando end-to-end (incluida la policy on-chain per-user).
- **Exit gate:** demo reproducible desde máquina limpia (incluye **deploy/seed del contrato de policy del usuario** en Monad Testnet), tests críticos pasan, audit/no-bypass probado y docs de operación listos; el runbook documenta deploy de contrato y lecturas RPC.
- **Unlocks hard:** release/demo readiness.
- **Can start early:** docs parciales sí; hardening final no.

## Critical path

```text
W0 facts
  -> W2 registry
  -> W3 policy/risk/audit
  -> W4 guarded forwarding
  -> W5 P0 actions
  -> W6 demo hardening
```

W1 corre en paralelo con W0/W2 y se une en W4. W4 es el join point donde proxy plumbing, registry, policy, digest, idempotency y audit se convierten en runtime.

---

## W0 — Upstream + Monad PoC

**Goal:** prove the external assumptions that the proxy depends on.

**Deliverables:**

- Install and run `bunx wallet-agent@latest` locally.
- Capture upstream `tools/list` schemas for P0 tools.
- Compute provisional `input_schema_hash` / `upstream_schema_hash` for each exposed tool.
- Validate `add_custom_chain` and `switch_chain` for Monad Testnet `10143`.
- Validate `get_wallet_info`, `get_balance`, `estimate_gas`, `simulate_transaction` or `dry_run_transaction` against Monad Testnet.
- Validate a minimal testnet `transfer_token` or `send_transaction` path when safe to do so.
- Validate that `approve_token` with `uint256.max` can be identified before forward.
- Choose `MONAD_RPC_URL` provider for demo and record rate-limit/gas caveats.
- Confirm the host MCP config can be kept free of direct Wallet Agent access.

**Acceptance:**

- `tools/list` schemas are saved as fixtures for registry tests.
- Monad Testnet chain id `10143` is confirmed at runtime.
- At least one read-only call and one simulation/dry-run works through Wallet Agent or has a documented fallback.
- Any missing upstream capability is recorded as a blocker or ADR before W4/W5 depend on it.

---

## W1 — MCP proxy skeleton + upstream adapter

**Goal:** make Compass act as the MCP server seen by the host and MCP client to the upstream.

**Deliverables:**

- `compass-proxy` entrypoint accepting:
  - `--upstream "bunx wallet-agent@latest"`
  - `--chain monad-testnet`
  - `--policy ./policy.monad.json`
- MCP server over stdio for Claude/Codex/Cursor.
- Upstream MCP client over stdio.
- Upstream process lifecycle: start, connect, disconnect, safe shutdown.
- `tools/list` pass that can fetch upstream tools and hand them to the registry filter.
- Meta-tools with `compass_` prefix only, for example `compass_status` and `compass_audit_events`.
- Safe errors for upstream unavailable, invalid upstream response and unsupported transport.

**Acceptance:**

- The host can connect to Compass as an MCP server.
- Compass can connect to a mocked upstream and to Wallet Agent when W0 is available.
- No upstream tool is exposed before registry filtering.
- Wallet Agent is never required in the host MCP config.

---

## W2 — Tool semantics registry

**Goal:** define what every exposed upstream function does before runtime.

**Deliverables:**

- `ToolSemantics` registry with:
  - `registry_version`;
  - `upstream="wallet_agent"`;
  - `tool_name` and `exposed_name`;
  - `input_schema_hash` and `upstream_schema_hash`;
  - `tool_class`;
  - `state_effect`;
  - `required_fields`;
  - `required_evidence`;
  - `requires_simulation`;
  - `policy_checks`.
- P0 mappings for:
  - `add_custom_chain`
  - `switch_chain`
  - `get_wallet_info`
  - `get_balance`
  - `get_token_balance`
  - `estimate_gas`
  - `simulate_transaction`
  - `dry_run_transaction`
  - `send_transaction`
  - `transfer_token`
  - `approve_token`
  - `sign_typed_data`
- Default block/hidden behavior for private-key and unmapped tools.
- Tests that fail when upstream schema hashes drift.

**Acceptance:**

- Unmapped upstream tools are not exposed or return `UNMAPPED_TOOL` before policy.
- Schema drift disables the affected tool until the registry is updated.
- Registry tests prove tool classes and required evidence are deterministic.

---

## W3 — Policy, risk and audit foundation

**Goal:** create deterministic safety decisions before any forwarding with side effects.

**Deliverables:**

- `DemoPolicy` JSON schema with:
  - `chain_id=10143`;
  - `allowed_tools`;
  - `allowed_recipients`;
  - `allowed_tokens`;
  - exact `allowed_spenders` for token allowances;
  - gas and amount caps;
  - `block_unlimited_token_approvals=true`;
  - `allow_unknown_tools=false`.
- Policy engine returning only `allow|block`.
- Risk checks for:
  - wrong chain;
  - missing required evidence;
  - unsafe ERC20 allowances;
  - unknown/unmapped tools;
  - simulation unavailable/failed;
  - gas over policy;
  - recipient/token not allowlisted.
- `SafeError` model with no secret leakage.
- Local append-only audit writer with redaction allowlists.
- Audit events for proxy start, upstream connect, tools-list filtering, semantics resolved, policy evaluated, forward, block and upstream error.

**Acceptance:**

- Policy tests cover all `allow|block` branches.
- Unlimited token allowance always blocks.
- Unknown tools never reach policy.
- Audit redaction tests prove no secrets/raw sensitive payloads are persisted.

---

## W4 — Guarded forward pipeline

**Goal:** implement the actual proxy gate for `tools/call`, deciding `allow|block` against the **user's on-chain policy contract** on Monad Testnet (delivered by W3), not against a local JSON file.

**Deliverables:**

- `callInterceptor` implementing:
  ```text
  registry -> required evidence -> simulation/inspection -> risk -> policy(on-chain) -> allow/block -> audit
  ```
- Required-field validation from `ToolSemantics`.
- Simulation/dry-run orchestration for write/signature/token-approval classes.
- **On-chain policy resolution (consume W3):**
  - `policyResolver`: identidad de usuario (interfaz definida por W3) → dirección del contrato de policy del usuario. Interfaz abstracta; se reconcilia con el shape real de W3.
  - `onchainPolicyReader`: lectura del estado del contrato de policy vía RPC (`eth_call`/viem) con **caché + regla de frescura** y semántica **fail-closed** (si no se resuelve/lee → `block`).
- `GuardedForwardRecord` with:
  - `forward_id`;
  - `audit_event_id`;
  - `candidate_tx_digest` when applicable;
  - `covered_fields`;
  - `idempotency_key` for broadcast/execution;
  - risk/simulation snapshots;
  - **`policy_source` on-chain:** `policy_contract_address`, `policy_chain_id=10143` y snapshot `policy_version`/`policy_block` (contra qué policy on-chain se decidió).
- Canonical digest builder covering chain, account, target, value, data, tool name, normalized args, token/spender/amount and relevant gas/fee fields.
- Forward path that sends the original `tools/call` to Wallet Agent only after `allow`.
- Block path that never calls upstream and returns a safe explanation.
- Idempotency store/result reuse for any broadcast/execution tool.
- **Nuevos `SafeError`:** `USER_POLICY_UNRESOLVED`, `POLICY_CONTRACT_UNAVAILABLE` (sin filtrar detalles de RPC ni del contrato).

**Acceptance:**

- Blocked calls are proven not to reach the upstream mock.
- Allowed calls forward exactly one upstream `tools/call`.
- Digest mismatch blocks or forces re-simulation/re-evaluation.
- Same `idempotency_key` cannot execute twice.
- Every terminal path writes sanitized audit.
- **La decisión `allow|block` se evalúa contra el contrato de policy on-chain del usuario y el audit/`GuardedForwardRecord` referencia su snapshot (address + version/block).**
- **Si el contrato de policy del usuario está ausente o es ilegible, la decisión es `block` (fail-closed).**
- **Aislamiento por usuario:** la policy del usuario A nunca gobierna acciones del usuario B.

---

## W5 — Monad action coverage

**Goal:** cover the P0 Wallet Agent tools safely on Monad Testnet.

**Deliverables:**

- Chain management:
  - `add_custom_chain` allows only Monad Testnet config;
  - `switch_chain` allows only `10143`.
- Read-only calls:
  - `get_wallet_info`;
  - `get_balance`;
  - `get_token_balance`.
- Simulation calls:
  - `estimate_gas`;
  - `simulate_transaction`;
  - `dry_run_transaction`.
- Transaction execution calls:
  - `transfer_token` and/or `send_transaction` with simulation, digest, policy and idempotency.
- Token allowances:
  - unlimited `approve_token` blocks before upstream;
  - finite `approve_token` allows only exact `token + spender + amount + chain` policy match.
- Signature handling:
  - opaque signatures block;
  - `sign_typed_data` only allows mapped typed data with expected domain/chain/verifyingContract/primaryType.
- Monad RPC behavior handling for async send validation, no pending tx lookup, provisional `latest`, gas estimation caveats and provider limits.
- **Per-user policy contract lifecycle (on-chain):**
  - lectura de la policy on-chain del usuario, consumida por toda acción guardada (vía W4);
  - **deploy/registro/update del contrato de policy del usuario tratado como acción on-chain guardada** (pasa por evidencia/simulación/digest/idempotencia y policy-sobre-policy: solo el dueño autorizado puede modificar su propia policy);
  - **bootstrap** explícito: cómo se crea el primer contrato de policy del usuario, como acción guardada y auditada.

**Acceptance:**

- Claude can use Compass to perform read-only calls without direct Wallet Agent access.
- A safe Monad Testnet action forwards only after registry/evidence/simulation/**on-chain policy** pass.
- Dangerous allowance and private-key/key-management tools are blocked before upstream.
- Audit includes decision, digest when applicable, **on-chain policy snapshot (contract address + version/block)** and upstream result/error.
- **Las allowances finitas se validan contra las allowlists declaradas en el contrato de policy on-chain del usuario; unlimited bloquea antes del upstream.**
- **El update del contrato de policy del usuario se ejecuta como acción guardada (digest + idempotencia) y queda auditado; el aislamiento por usuario está probado.**

---

## W6 — Demo hardening and release readiness

**Goal:** make the demo reproducible, safe and reviewable.

**Deliverables:**

- Demo chain config examples and a **per-user policy contract** seed/config (la policy de demo vive on-chain, no como archivo local de reglas).
- Host setup instructions showing Compass only, no direct Wallet Agent MCP.
- End-to-end smoke script:
  - start Compass;
  - connect Wallet Agent upstream;
  - configure Monad Testnet;
  - **deploy/seed del contrato de policy del usuario en Monad Testnet** (acción guardada);
  - read wallet state/balance;
  - simulate/dry-run;
  - **forward de acción segura permitida por la policy on-chain**;
  - **block de allowance peligrosa según la policy on-chain**;
  - inspect audit (incluye la **referencia al contrato de policy**: address + version/block).
- Tests for registry, **on-chain policy read**, blocked upstream calls, digest, idempotency and audit redaction; **fail-closed ante contrato de policy no disponible**; **aislamiento por usuario**; snapshot del contrato de policy en audit/digest; update guardado del contrato.
- Runbook for Monad RPC provider choice and known RPC caveats, **más pasos de deploy del contrato de policy (foundry/hardhat) y lecturas `eth_call`**.
- Known limitations and ADR list for anything not validated, **incluyendo el modelo de policy on-chain per-user, la identidad de usuario (pendiente de W3), costo/latencia de lecturas on-chain y la semántica fail-closed**.

**Acceptance:**

- Demo runs from a clean machine using only Compass in the host MCP config.
- Critical tests pass.
- Reviewers can verify the proxy boundary without reading product history.
- No secrets are read, logged, exported or committed.
- **La demo muestra decisiones `allow|block` gobernadas por el contrato de policy on-chain del usuario, con la referencia al contrato visible en el audit.**

---

## Parallelization guidance

- W0 starts first and produces real upstream facts.
- W1 can start immediately with mocked upstream.
- W2 can start with provisional entries, but final hashes wait for W0.
- W3 can start once W2 shape exists.
- W4 should stay single-threaded because it joins proxy, registry, **policy on-chain (lectura del contrato per-user)**, digest, idempotency and audit.
- W5 should be narrow and evidence-driven; each tool class can be validated independently after W4. El **ciclo de vida del contrato de policy** (deploy/update) se cubre como su propia acción guardada.
- W6 is final hardening, not a place to introduce new architecture.

## Explicitly out of P0

No construir en esta wave chain:

- UI/dashboard de aprobación.
- Firma manual del usuario por transacción.
- Auth web/CLI externo.
- Rutas legacy de auth/firma delegada fuera del proxy.
- Rutas legacy de otras chains.
- Mainnet.
- Multi-chain real.
- x402 productivo.
- Threat intelligence externa.
- LLM como autoridad de seguridad.
- Wallet Agent directo en el host MCP.

## Recommended first implementation order

1. W0: correr PoC Wallet Agent + Monad y guardar schemas.
2. W1: crear proxy MCP server/client con upstream mock.
3. W2: implementar registry con hashes y tests de drift.
4. W3: implementar policy/risk/audit base (incluye el contrato de policy on-chain per-user y la identidad de usuario).
5. W4: implementar guarded forwarding con digest e idempotencia, decidiendo contra la policy on-chain del usuario (fail-closed).
6. W5: cubrir tools P0 reales contra Wallet Agent + Monad Testnet y el ciclo de vida del contrato de policy.
7. W6: endurecer demo (deploy/seed de policy on-chain), docs, tests y no-bypass proof.

## Fuentes oficiales usadas

- Monad docs index: `https://docs.monad.xyz/llms.txt`
- Monad MCP guide: `https://docs.monad.xyz/guides/monad-mcp.md`
- Monad Testnet info: `https://docs.monad.xyz/developer-essentials/testnets.md`
- Monad JSON-RPC overview: `https://docs.monad.xyz/reference/json-rpc/overview.md`
- Monad JSON-RPC `eth_call` (lectura de estado del contrato de policy): `https://docs.monad.xyz/reference/json-rpc/api.md`
- Monad smart contract deploy (contrato de policy on-chain): `https://docs.monad.xyz/guides/deploy-smart-contract/index.md`
- Repo source of truth: `docs/constitution.md`
- Product input: `compass_product_spec_monad_mcp_proxy_v0.2.md`
