# Compass Monad — Constitución del Repo

**Estado:** v0.4 — fuente de verdad inicial endurecida  
**Fecha:** 2026-05-29  
**Owner:** maintainers del repo  
**Última validación externa:** pendiente; ver sección 13  
**Alcance:** todo el repo `compass_monad`  
**Producto:** Compass para Monad — safety and authorization layer for AI agents operating wallets

Esta constitución define las reglas que no queremos rediscutir en cada archivo: arquitectura, límites de seguridad, estructura de carpetas, modelos de datos, interfaces y criterios de implementación. Si una decisión futura contradice este documento, primero se actualiza esta constitución o se agrega un ADR/RFC explícito.

## Quick read

- **Demo P0:** Claude Code usa Compass mediante MCP; la web solo hace onboarding humano.
- **Wallet/firma:** Dynamic embedded EVM wallet + backend programmatic signing vía Delegated Access.
- **Safety boundary:** Claude solicita acciones; Compass revisa, decide, firma y audita.
- **Nunca:** claves/private keys en Claude, tools raw signing, endpoints públicos de ejecución.
- **Antes de firmar:** token MCP válido, review vigente, digest de tx matching, policy `allow`, idempotencia y audit.
- **Bloqueantes P0:** validar chain id Monad, SDK Dynamic, webhook, delegated signing y storage local; ver sección 13.

---

## 1. Decisiones fundacionales

| Tema | Decisión |
| --- | --- |
| Demo principal | **Claude Code vía MCP**, no web app transaccional. |
| Chain | **Monad testnet** como target P0. El `chainId` vive en config (`MONAD_CHAIN_ID`). `10143` queda como valor provisional observado en docs de Dynamic hasta validarlo con Monad/Dynamic Dashboard. |
| Wallet | **Dynamic embedded EVM wallet**. La wallet pertenece al usuario. |
| Firma | **Backend programmatic signing con Dynamic Delegated Access**, nunca desde Claude directamente. |
| UX de autorización | El usuario autoriza una delegación inicial; no debe aprobar cada tx con popup de wallet. |
| Safety boundary | Claude pide acciones; **Compass decide** si se firma/ejecuta. |
| Tooling principal | MCP server. CLI puede existir solo como debug/fallback. |
| Auth MCP/backend | El MCP local obtiene un token scoped mediante bootstrap/pairing. El usuario no configura manualmente una API key. |
| Reuso del repo Solana | Reutilizar patrones, componentes, contratos de API/types y estructura; no portar código Solana-specific como dependencia central. |
| Producto | Compass no es wallet ni chatbot. Es una capa de autorización segura para agentes. |

---

## 2. Invariantes de seguridad

Estas reglas son no negociables.

1. **Claude nunca recibe claves, key shares, wallet API keys ni private keys.**
2. **No existe una tool MCP genérica `sign_raw_transaction` o `send_raw_transaction`.**
3. Toda ejecución pasa por:
   ```text
   intent -> normalization -> tx build/intake -> simulation/inspection -> risk -> policy -> signing -> broadcast -> audit
   ```
4. Si Compass no puede explicar razonablemente una acción, debe escalar riesgo o bloquear.
5. Si la transacción candidata no coincide con lo revisado, no se firma ni se emite.
6. Dynamic delegated credentials se reciben solo por webhook verificado, se descifran backend-side, se guardan cifradas y nunca se loguean.
7. El backend firma únicamente bajo una delegación activa, un token MCP válido y una policy vigente.
8. Endpoints públicos de bootstrap/pairing no pueden firmar, ejecutar ni consultar secrets.
9. Endpoints HTTP de ejecución requieren autenticación machine-to-machine o ejecución in-process equivalente; nunca quedan públicos sin auth.
10. Approvals peligrosos (`uint256.max`, `setApprovalForAll`, Permit2 no allowlisted) son bloqueados por default.
11. Unknown high-value contract calls requieren bloqueo o policy explícita.
12. Audit trail es parte del producto, no logging accidental.
13. Toda ejecución debe estar atada a una revisión vigente mediante `review_id` y digest canónico de la transacción candidata.
14. La idempotencia de ejecución es obligatoria: un retry no puede producir una segunda firma/broadcast para la misma intención.
15. Errores, audit metadata y logs públicos nunca pueden incluir secrets, key material, raw delegated payloads ni tokens plaintext.
16. Cambios de policy deben quedar versionados y auditados; la ejecución usa un snapshot de policy, no estado implícito.

---

## 3. Arquitectura objetivo P0

```text
Claude Code
  |
  v
Compass MCP Server local
  - bootstrap/pairing client
  - stores scoped MCP token locally
  |
  v
Compass Backend/API
  - MCP bootstrap/session auth
  - delegation registry
  - intent normalization
  - EVM transaction builder/intake
  - calldata decoder
  - simulation/inspection
  - risk engine
  - policy engine
  - audit trail
  |
  | 1. request signature for reviewed tx
  v
Dynamic Delegated Access
  |
  | 2. returns signed raw transaction
  v
Compass Backend/API
  |
  | 3. broadcasts signed tx
  v
Monad Testnet RPC
```

### 3.1 Web mínima

La web no es la demo principal. Existe para onboarding humano:

1. login con Dynamic;
2. creación/selección de embedded wallet EVM;
3. aprobación de delegated access para Compass;
4. estado “ready for Claude Code”.

La web no debe implementar un dashboard completo, chat productivo ni approval manual por transacción en P0.

### 3.2 MCP como superficie principal

Claude Code interactúa con Compass mediante tools MCP. El MCP server es una interfaz fina: valida inputs, llama al backend/core y devuelve resultados estructurados. No contiene lógica crítica de firma por sí mismo.

### 3.3 Matriz de auth por superficie HTTP

| Superficie | Auth requerida | Puede firmar | Accede a secrets | Notas |
| --- | --- | --- | --- | --- |
| `POST /api/mcp/bootstrap` | público + rate limit | no | no | Crea sesión pending y devuelve setup URL/pairing code. |
| `GET/POST /api/mcp/bootstrap/[sessionId]` | `mcp_session_id + poll_token` | no | no | Polling one-time para retirar token MCP final. |
| `POST /api/mcp/logout` | token MCP | no | no | Revoca token MCP; no revoca delegación salvo flujo explícito. |
| `POST /api/setup/session` | sesión web autenticada por Dynamic/app | no | no | Registra pairing con usuario/wallet verificados. |
| `GET /api/wallet/state` | token MCP o sesión web | no | no | Lectura operativa sin secrets. |
| `POST /api/intents/review` | token MCP con `intent:review` | no | no directo | Construye/revisa tx candidata y emite `review_id`. |
| `POST /api/intents/execute` | token MCP con `intent:execute` | sí, si policy allow | signer path aislado | Solo ejecuta un `review_id` vigente + digest matching + idempotency. |
| `GET /api/audit/events` | token MCP con `audit:read` o sesión web | no | no | Metadata allowlisted y redacted. |
| `POST /api/dynamic/delegation/webhook` | firma Dynamic sobre raw body | no directo | decrypt path controlado | Idempotente por `eventId`; nunca loguea payload sensible. |

Todas las superficies públicas deben tener rate limit y respuestas seguras. Ninguna ruta de bootstrap, setup o webhook puede ejecutar intents ni firmar transacciones.

---

## 4. Estructura de carpetas

La estructura base recomendada es:

```text
.
├── app/                         # Next.js App Router: web mínima + API routes
│   ├── page.tsx                 # Setup/status UI
│   └── api/
│       ├── mcp/bootstrap/route.ts
│       ├── mcp/bootstrap/[sessionId]/route.ts
│       ├── mcp/logout/route.ts
│       ├── dynamic/delegation/webhook/route.ts
│       ├── setup/session/route.ts
│       ├── wallet/state/route.ts
│       ├── intents/review/route.ts
│       ├── intents/execute/route.ts
│       └── audit/events/route.ts
│
├── front/                       # UI client-side de setup/delegation status
│   ├── src/components/
│   ├── src/hooks/
│   ├── src/providers/
│   ├── src/lib/
│   └── src/types/
│
├── back/                        # Core server-side reusable
│   ├── services/
│   │   ├── dynamic/
│   │   │   ├── delegationWebhook.ts
│   │   │   ├── delegatedSigner.ts
│   │   │   └── dynamicAuth.ts
│   │   ├── evm/
│   │   │   ├── chains.ts
│   │   │   ├── calldata.ts
│   │   │   ├── transactions.ts
│   │   │   ├── simulation.ts
│   │   │   └── broadcast.ts
│   │   ├── intent/
│   │   │   ├── normalizeIntent.ts
│   │   │   └── supportedActions.ts
│   │   ├── policy/
│   │   │   ├── evaluatePolicy.ts
│   │   │   └── policySchemas.ts
│   │   ├── risk/
│   │   │   ├── scoreRisk.ts
│   │   │   └── riskChecks.ts
│   │   ├── audit/
│   │   │   └── auditLog.ts
│   │   ├── mcp/
│   │   │   ├── bootstrap.ts
│   │   │   ├── mcpSessions.ts
│   │   │   └── authenticateMcp.ts
│   │   └── setup/
│   │       └── pairingSessions.ts
│   └── db/
│       ├── schema.ts
│       └── migrations/
│
├── mcp/                         # Compass MCP server para Claude Code
│   ├── server.ts
│   ├── tools/
│   │   ├── compassStatus.ts
│   │   ├── getWalletState.ts
│   │   ├── reviewIntent.ts
│   │   ├── executeGuardedIntent.ts
│   │   └── getAuditEvents.ts
│   └── schemas.ts
│
├── shared/                      # Tipos/Zod schemas compartidos sin secrets
│   ├── schemas/
│   ├── types/
│   └── constants/
│
├── docs/
│   ├── constitution.md          # Este documento
│   ├── adr/                     # Architecture Decision Records
│   └── specs/                   # Specs por feature si hacen falta
│
├── scripts/                     # Scripts de setup/debug/demo
└── tests/                       # Tests integrados cross-boundary si aplica
```

### Regla de imports

| Desde | Puede importar | No puede importar |
| --- | --- | --- |
| `front/` | `shared/*`, API client | `back/*`, secrets, Dynamic server SDK |
| `mcp/` | `shared/*`, backend client/core seguro | Dynamic delegated credentials directamente |
| `app/api/*` | `back/services/*`, `shared/*` | UI internals |
| `back/services/*` | `shared/*`, server SDKs, DB | React/UI |
| `shared/*` | librerías puras | env vars, DB, network calls con secrets |

---

## 5. Flujo de setup, pairing y token MCP

Claude no abre popups de wallet. Devuelve un link de setup cuando falta autorización. El usuario no copia una API key manualmente.

```text
1. Claude llama `compass_status`.
2. MCP local no encuentra credenciales locales.
3. MCP llama `POST /api/mcp/bootstrap`.
4. Backend crea `mcp_session_id`, `pairing_code`, `setup_url` y `poll_token`.
5. Backend guarda `poll_token_hash`; el `poll_token` completo solo vuelve al MCP local.
6. MCP devuelve a Claude `needs_setup` con `setup_url` y `pairing_code`; no muestra `poll_token`.
7. Usuario abre la web mínima.
8. Usuario inicia sesión con Dynamic y selecciona/crea embedded wallet EVM.
9. Antes de delegar, la web registra el pairing:
   `pairing_code + dynamic_user_id + wallet_address + wallet_id`.
10. El endpoint de registro de pairing exige sesión web autenticada por Dynamic/app session y verifica que `wallet_id/wallet_address` pertenezcan al usuario autenticado.
11. La web llama al SDK que soporte `delegateWaasKeyShares` para iniciar la delegación.
12. Dynamic envía webhook `wallet.delegation.created`.
13. Backend verifica firma del webhook contra el raw body, usa `eventId` como idempotency key, descifra materiales y guarda delegación cifrada.
14. Backend matchea el webhook con el pairing por `dynamic_user_id + wallet_id` o `dynamic_user_id + publicKey`.
15. Pairing session queda `ready`.
16. MCP hace polling autenticado con `mcp_session_id + poll_token`.
17. Backend emite un token MCP scoped y de corta vida.
18. MCP guarda ese token localmente y lo usa como `Authorization: Bearer <token>` para APIs protegidas.
19. Claude vuelve a llamar `compass_status` y recibe `ready`.
```

### 5.1 Reglas del token MCP

- El token MCP no es una private key, key share, Dynamic API key ni wallet API key.
- El token solo autentica al MCP local frente al backend de Compass.
- El token debe tener scopes explícitos, por ejemplo `wallet:read`, `intent:review`, `intent:execute`, `audit:read`.
- El modelo P0 usa **token opaco random + hash en DB**. No usar JWT/HMAC salvo que un ADR cambie esta decisión.
- El token se guarda localmente fuera del repo, por ejemplo `~/.compass/credentials.json`, con permisos `0600`, o en keychain si hay tiempo.
- `mcp_session_id` solo no alcanza para retirar el token final; el polling requiere `poll_token`.
- `COMPASS_MCP_API_KEY` puede existir solo como fallback de desarrollo/manual; no es el happy path de demo.
- `/api/mcp/logout` revoca el token MCP y permite borrar credenciales locales. No implica revocar Dynamic delegated access salvo que se llame explícitamente a un flujo de revocación de delegación.

### 5.2 Hardening de bootstrap/pairing

- `pairing_code` debe tener entropía suficiente para resistir brute force durante su TTL; si es human-readable, usar rate limit agresivo e intentos máximos.
- `poll_token` debe ser random de alta entropía, guardarse solo hasheado y ser necesario para retirar el token MCP final.
- Al emitir el token MCP final, el polling debe quedar consumido o invalidado para evitar reuse.
- `pairing_sessions` expiran rápido y pasan a `expired/cancelled` si se supera el TTL o se detectan demasiados intentos.
- Endpoints de bootstrap/polling/setup deben tener rate limit por IP, `mcp_session_id` y `pairing_code`.
- La web de setup debe restringir CORS/origin a `NEXT_PUBLIC_COMPASS_BASE_URL` y verificar la sesión app/Dynamic antes de asociar wallet.
- El `pairing_code` mostrado por Claude no autentica por sí solo; solo vincula UX. La autenticación real viene de sesión web + wallet verificada + webhook firmado + `poll_token`.

### 5.3 Dynamic SDK pendiente de validación

La web puede usar Dynamic React SDK para auth/UI, pero la acción de delegación debe implementarse con el SDK que exponga `delegateWaasKeyShares`. En docs Dynamic aparece bajo `@dynamic-labs-sdk/client/waas`; validar compatibilidad exacta antes de implementar.

---

## 6. MCP tools canónicas

### 6.0 Contrato `review_intent -> execute_guarded_intent`

`review_intent` es el gate canónico de seguridad. Debe construir o ingerir la transacción candidata, simularla/inspeccionarla, evaluarla contra policy y devolver un `review_id` con un `candidate_tx_digest` canónico.

`execute_guarded_intent` no debe firmar texto libre como contrato P0. Debe recibir un `review_id` vigente, reconstruir o recuperar la transacción revisada, recalcular el digest y bloquear si no coincide exactamente con lo revisado.

El digest canónico debe cubrir al menos: `chain_id`, `from`, `to`, `value`, `data`, tipo de tx, gas/fee relevantes cuando ya estén fijados y cualquier campo que pueda cambiar el efecto de la transacción. Si el backend decide recalcular gas/nonce al ejecutar, debe documentar qué campos son variables seguros y volver a aplicar policy antes de firmar.

### 6.1 `compass_status`

Uso: saber si Claude puede operar o necesita setup.

```ts
type CompassStatusResult =
  | {
      status: 'needs_setup';
      setup_url: string;
      pairing_code: string;
      expires_at: string;
    }
  | {
      status: 'ready';
      wallet_address: `0x${string}`;
      chain_id: number;
      chain_name: string; // P0 expects Monad testnet, exact slug/name comes from config
      policy_summary: string;
      delegation_status: 'active';
    };
```

### 6.2 `get_wallet_state`

Uso: consultar estado operativo, no firmar.

```ts
type GetWalletStateResult = {
  wallet_address: `0x${string}`;
  chain_id: number;
  native_balance_wei: string;
  token_balances: Array<{
    token_address: `0x${string}`;
    symbol: string;
    decimals: number;
    balance: string;
  }>;
  delegation_status: 'active' | 'missing' | 'revoked' | 'expired';
};
```

### 6.3 `review_intent`

Uso: revisar sin ejecutar.

```ts
type ReviewIntentInput = {
  intent: string;
};

type ReviewIntentResult = {
  review_id: string;
  intent_id: string;
  candidate_tx_digest: `0x${string}`;
  reviewed_tx: {
    chain_id: number;
    from: `0x${string}`;
    to?: `0x${string}`;
    value_wei?: string;
    data_digest?: `0x${string}`;
  };
  normalized_action: NormalizedAction;
  simulation: SimulationResult;
  risk: RiskAssessment;
  policy: PolicyDecision;
  policy_id: string;
  policy_version: string;
  expires_at: string;
  review_text: string;
};
```

### 6.4 `execute_guarded_intent`

Uso: ejecutar solo una revisión vigente si Compass lo permite. `idempotency_key` es obligatorio para que retries no firmen dos veces.

```ts
type ExecuteGuardedIntentInput = {
  review_id: string;
  idempotency_key: string;
};

type ExecuteGuardedIntentResult =
  | {
      status: 'executed';
      intent_id: string;
      tx_hash: `0x${string}`;
      audit_event_id: string;
      risk_level: RiskLevel;
      policy_decision: 'allow';
    }
  | {
      status: 'blocked' | 'requires_policy_change';
      intent_id: string;
      audit_event_id: string;
      reasons: RiskReason[];
      review_text: string;
    }
  | {
      status: 'failed';
      intent_id?: string;
      audit_event_id: string;
      error_code: string;
      error_message: string;
    };
```

### 6.5 `get_audit_events`

Uso: mostrar trazabilidad en Claude.

```ts
type GetAuditEventsInput = {
  limit?: number;
  intent_id?: string;
};

type GetAuditEventsResult = {
  events: AuditEvent[];
};
```

---

## 7. Modelos y schemas canónicos

Los schemas deben implementarse en Zod/TypeScript antes de ser usados por APIs o MCP.

### 7.1 `DecodedCall` y `NormalizedAction`

```ts
type DecodedCall = {
  function_name?: string;
  signature?: string; // e.g. transfer(address,uint256)
  selector?: `0x${string}`;
  args?: Record<string, unknown>;
  abi_source?: 'known_abi' | 'erc20_standard' | 'unknown';
};

type NormalizedAction =
  | {
      kind: 'native_transfer';
      chain_id: number; // P0 must equal configured MONAD_CHAIN_ID
      from: `0x${string}`;
      to: `0x${string}`;
      amount_wei: string;
    }
  | {
      kind: 'erc20_transfer';
      chain_id: number; // P0 must equal configured MONAD_CHAIN_ID
      from: `0x${string}`;
      token: `0x${string}`;
      to: `0x${string}`;
      amount_atomic: string;
    }
  | {
      kind: 'erc20_approval';
      chain_id: number; // P0 must equal configured MONAD_CHAIN_ID
      owner: `0x${string}`;
      token: `0x${string}`;
      spender: `0x${string}`;
      amount_atomic: string;
    }
  | {
      kind: 'contract_call';
      chain_id: number; // P0 must equal configured MONAD_CHAIN_ID
      from: `0x${string}`;
      to: `0x${string}`;
      value_wei: string;
      data: `0x${string}`;
      decoded?: DecodedCall;
    };
```

### 7.2 `RiskAssessment`

```ts
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type RiskReason = {
  code: string;
  level: RiskLevel;
  category:
    | 'chain'
    | 'intent_match'
    | 'amount'
    | 'recipient'
    | 'token'
    | 'approval'
    | 'contract'
    | 'simulation'
    | 'policy'
    | 'delegation';
  message: string;
  evidence?: Record<string, unknown>;
};

type RiskAssessment = {
  score: number; // 0-100
  level: RiskLevel;
  reasons: RiskReason[];
  blocking_findings: RiskReason[];
};
```

### 7.3 `PolicyDecision`

```ts
type PolicyDecision = {
  decision: 'allow' | 'block' | 'requires_policy_change';
  matched_policies: string[];
  explanation: string;
};
```

P0 no usa `require_approval` para wallet popup ni step-up por transacción. Si una acción necesita aprobación humana fuera de la delegación existente, debe responder `requires_policy_change` o `block` para Claude. `require_step_up_auth` queda como opción futura, no contrato P0.

### 7.4 `SimulationResult`

```ts
type SimulationResult = {
  status: 'success' | 'failed' | 'unavailable';
  chain_id: number;
  from: `0x${string}`;
  to?: `0x${string}`;
  value_wei?: string;
  nonce?: number;
  gas_estimate?: string;
  max_fee_per_gas_wei?: string;
  estimated_gas_cost_wei?: string;
  native_balance_delta_wei?: string;
  token_deltas?: Array<{
    token: `0x${string}`;
    account: `0x${string}`;
    delta_atomic: string;
  }>;
  warnings: string[];
  raw_error?: string;
};
```

### 7.5 `AuditEvent`

```ts
type AuditEvent = {
  event_id: string;
  timestamp: string;
  source: 'mcp' | 'web' | 'api' | 'system';
  agent_id?: string; // e.g. claude_code
  dynamic_user_id?: string;
  wallet_address?: `0x${string}`;
  chain_id?: number;
  action:
    | 'setup_started'
    | 'delegation_created'
    | 'delegation_revoked'
    | 'intent_received'
    | 'intent_reviewed'
    | 'policy_evaluated'
    | 'transaction_signed'
    | 'transaction_broadcast'
    | 'transaction_blocked'
    | 'transaction_failed';
  intent_id?: string;
  tx_hash?: `0x${string}`;
  risk_level?: RiskLevel;
  policy_decision?: PolicyDecision['decision'];
  policy_id?: string;
  policy_version?: string;
  result: 'success' | 'blocked' | 'failed' | 'pending';
  metadata?: Record<string, unknown>; // allowlist por action; nunca secrets/raw delegated payloads/tokens
};
```

`metadata` debe ser una allowlist por `action`, no un dump libre de objetos internos. Cualquier campo derivado de webhooks, signing, env vars o tokens debe ser redacted antes de entrar al audit trail.

### 7.6 Error model seguro

Errores devueltos al MCP/web deben ser seguros para usuario final y no revelar internals sensibles.

```ts
type SafeError = {
  error_code:
    | 'AUTH_REQUIRED'
    | 'POLICY_BLOCKED'
    | 'REVIEW_EXPIRED'
    | 'DIGEST_MISMATCH'
    | 'SIMULATION_FAILED'
    | 'SIMULATION_UNAVAILABLE'
    | 'SIGNER_UNAVAILABLE'
    | 'BROADCAST_FAILED'
    | 'INTERNAL_ERROR';
  safe_message: string;
  debug_ref?: string;
};
```

`raw_error` solo puede existir en logs internos sanitizados o en `SimulationResult.raw_error` cuando no contiene secrets. MCP responses deben usar `SafeError` o campos equivalentes.

---

## 8. DB schemas mínimos

La DB puede ser SQLite/Supabase/Postgres para hackathon, pero los conceptos son estables.

### 8.1 `mcp_sessions`

Representa una instalación/local session del MCP. No contiene delegated credentials.

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | `mcp_session_id`. |
| `status` | `pending | active | expired | revoked` |  |
| `agent_id` | text | P0: `claude_code`. |
| `poll_token_hash` | text | Hash del token de polling bootstrap; nunca guardar token plaintext. |
| `token_hash` | text nullable | Hash del token MCP emitido; nunca guardar token plaintext. |
| `scopes_json` | json | Ej: `wallet:read`, `intent:review`, `intent:execute`, `audit:read`. |
| `delegation_id` | string nullable | Se completa cuando el pairing queda ready. |
| `created_at` | timestamp |  |
| `expires_at` | timestamp | TTL del token/session. |
| `last_seen_at` | timestamp nullable | Observabilidad. |
| `revoked_at` | timestamp nullable |  |

### 8.2 `pairing_sessions`

Une el setup URL mostrado por Claude con el usuario/wallet que aprueba Dynamic.

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | ID interno. |
| `mcp_session_id` | string | FK lógica a `mcp_sessions`. |
| `pairing_code` | string unique | Código mostrado a Claude/usuario. |
| `status` | `pending | ready | expired | cancelled` | Estado setup. |
| `dynamic_user_id` | string nullable | Se registra antes de delegar. |
| `wallet_id` | text nullable | Dynamic wallet ID; necesario para matchear webhook. |
| `wallet_address` | text nullable | `publicKey`/EVM address. |
| `created_at` | timestamp |  |
| `expires_at` | timestamp | TTL corto. |

### 8.3 `delegations`

Guarda los materiales de Dynamic Delegated Access cifrados. Nunca plaintext.

| Campo | Tipo | Nota |
| --- | --- | --- |
| `id` | string | ID interno. |
| `dynamic_event_id` | string unique | Idempotency key del webhook `wallet.delegation.created`. |
| `dynamic_webhook_id` | string nullable | Observabilidad. |
| `dynamic_user_id` | string | User Dynamic. |
| `wallet_address` | text | EVM address / `publicKey`. |
| `wallet_id` | text | Dynamic wallet ID. |
| `chain` | text | P0: `EVM`. |
| `chain_id` | integer | P0: configured `MONAD_CHAIN_ID`. |
| `status` | `active | revoked | expired` |  |
| `policy_json` | json | Límites de ejecución. |
| `encrypted_wallet_api_key` | text | Cifrado propio at-rest tras descifrar webhook. |
| `encrypted_key_share` | text | Cifrado propio at-rest tras descifrar webhook. |
| `created_at` | timestamp |  |
| `expires_at` | timestamp nullable | Recomendado incluso en demo. |
| `revoked_at` | timestamp nullable |  |

### 8.4 `webhook_events`

Registro idempotente y auditable de webhooks Dynamic.

| Campo | Tipo | Nota |
| --- | --- | --- |
| `event_id` | string unique | Dynamic `eventId`. |
| `event_name` | text | Ej: `wallet.delegation.created`, `wallet.delegation.revoked`. |
| `webhook_id` | text nullable | Dynamic `webhookId`. |
| `status` | `received | processed | ignored | failed` |  |
| `received_at` | timestamp |  |
| `processed_at` | timestamp nullable |  |
| `error_code` | text nullable | Sanitizado. |

### 8.5 `intent_reviews`

| Campo | Tipo | Nota |
| --- | --- | --- |
| `review_id` | string unique | Handle devuelto por `review_intent`; requerido por ejecución. |
| `intent_id` | string unique | Referencia lógica para audit/idempotencia. |
| `mcp_session_id` | string nullable | Caller MCP. |
| `delegation_id` | string nullable | Delegación usada para ejecución, si aplica. |
| `idempotency_key` | text nullable | Unique con `mcp_session_id` cuando se ejecuta; requerido por `execute_guarded_intent`. |
| `raw_intent` | text | Input de Claude. |
| `candidate_tx_digest` | text nullable | Hash canónico de la tx revisada; non-null para ejecución. |
| `reviewed_tx_json` | json nullable | Resumen/campos canónicos de la tx revisada. |
| `normalized_action_json` | json | `NormalizedAction`. |
| `simulation_json` | json | `SimulationResult`. |
| `risk_json` | json | `RiskAssessment`. |
| `policy_json` | json | `PolicyDecision` snapshot. |
| `policy_id` | text | Policy evaluada. |
| `policy_version` | text | Versión/snapshot usado para review/execute. |
| `status` | `reviewed | executed | blocked | failed | expired` |  |
| `review_expires_at` | timestamp | Límite para ejecutar sin nueva revisión. |
| `created_at` | timestamp |  |

### 8.6 `audit_events`

Append-only. No se actualizan eventos existentes salvo corrección administrativa explícita.

| Campo | Tipo | Nota |
| --- | --- | --- |
| `event_id` | string unique |  |
| `timestamp` | timestamp |  |
| `source` | text | `mcp`, `web`, `api`, `system`. |
| `agent_id` | text nullable |  |
| `mcp_session_id` | text nullable |  |
| `wallet_address` | text nullable |  |
| `chain_id` | integer nullable |  |
| `action` | text | Ver `AuditEvent`. |
| `intent_id` | text nullable |  |
| `tx_hash` | text nullable |  |
| `result` | text |  |
| `metadata_json` | json | Allowlist por action; sin secrets, raw webhook payloads, key material, tokens plaintext ni stack traces sensibles. |

---

## 9. Policy P0

La policy inicial debe ser simple y demo-friendly.

```ts
type DemoPolicy = {
  policy_id: string;
  policy_version: string;
  chain_id: number; // must equal configured MONAD_CHAIN_ID for P0
  max_native_transfer_wei: string;
  max_erc20_transfer_usd?: string;
  max_gas_cost_wei: string;
  max_fee_per_gas_wei?: string;
  allowed_recipients: `0x${string}`[];
  allowed_tokens: `0x${string}`[];
  blocked_spenders: `0x${string}`[];
  allow_unknown_contract_calls: false;
  allow_unlimited_approvals: false;
};
```

Default P0 determinístico:

1. `chain_id !== MONAD_CHAIN_ID` => `block`.
2. `native_transfer` => `allow` solo si `to` está en `allowed_recipients` **y** `amount_wei <= max_native_transfer_wei`; si no, `requires_policy_change` o `block` según severidad.
3. `erc20_transfer` => `allow` solo si token está en `allowed_tokens`, recipient está permitido por policy y monto no excede límites configurados.
4. `erc20_approval` => `block` si `amount_atomic` es `uint256.max`, spender está en `blocked_spenders` o spender/token no está explícitamente permitido.
5. `contract_call` desconocido => `block`; `allow_unknown_contract_calls` debe permanecer `false` en P0.
6. Gas estimado, `max_fee_per_gas_wei` o costo total por encima de policy => `requires_policy_change` o `block`; nunca `allow` silencioso.
7. Simulation unavailable => mínimo `medium/high`; `block` si hay value transfer, approval o unknown contract call.
8. Simulation failed => `block` salvo que sea una revisión no ejecutable explícitamente marcada como diagnóstico.

Cada evaluación debe guardar `policy_id`, `policy_version` y snapshot suficiente para reproducir la decisión. Cambios de policy requieren auth explícita, evento `policy_changed` y no alteran reviews ya emitidas salvo que se fuerce re-review.

Estas policies son enforceadas por Compass en P0. No asumir que Dynamic limita nativamente montos, destinos o acciones: Dynamic provee la capacidad de firma delegada; Compass provee el guardrail.

---

## 10. Reuso desde `../solana_hackathon`

### Reutilizar como patrón o adaptar

- separación `front/back/app/api`;
- Dynamic provider/auth/session approach;
- chat/proposal/risk card UI;
- structured guardrail explanations;
- audit event shape;
- API client + Zod schema discipline;
- Vitest setup;
- docs por feature.

### No portar como core

- Anchor programs;
- PDAs;
- SPL token assumptions;
- Solana RPC types;
- Orca/Pyth/devUSDC flows;
- Solscan wallet validation;
- Phantom-only signing model;
- conditional escrow Solana.

---

## 11. Variables de entorno

```bash
# Public/web
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=
NEXT_PUBLIC_COMPASS_BASE_URL=
NEXT_PUBLIC_MONAD_CHAIN_ID=10143 # provisional until validated

# Dynamic server-side
DYNAMIC_ENVIRONMENT_ID=
DYNAMIC_API_KEY=
DYNAMIC_WEBHOOK_SECRET=
DYNAMIC_DELEGATION_PRIVATE_KEY_PEM=
# If multiline envs are painful in the host, use one of these instead:
DYNAMIC_DELEGATION_PRIVATE_KEY_BASE64=
DYNAMIC_DELEGATION_PRIVATE_KEY_PATH=

# Delegation storage encryption
# 32 bytes base64 for AES-256-GCM/envelope encryption.
DELEGATION_ENCRYPTION_KEY=

# Monad/EVM
MONAD_CHAIN_ID=10143 # provisional until validated
MONAD_RPC_URL=
MONAD_EXPLORER_URL=

# MCP bootstrap/session auth
# P0 uses opaque random MCP tokens + DB hashes. No JWT secret required.
MCP_SESSION_TTL_SECONDS=86400
COMPASS_MCP_API_KEY= # optional dev/manual fallback only

# Demo/pairing
COMPASS_DEMO_AGENT_ID=claude_code
PAIRING_SESSION_TTL_SECONDS=900

# DB
DATABASE_URL=
```

Regla: ninguna variable sin prefijo `NEXT_PUBLIC_` se usa en frontend.

---

## 12. Testing mínimo

Antes de considerar estable una feature crítica:

- policy tests para allow/block;
- risk tests para approvals peligrosos;
- calldata decode tests;
- simulation fallback tests;
- delegated signer tests con Dynamic mockeado;
- MCP bootstrap/session token tests;
- MCP tool schema tests;
- endpoint auth matrix tests por ruta y scope;
- review/execute binding tests: `review_id` vigente, digest matching, digest mismatch bloquea;
- webhook signature verification tests;
- webhook idempotency tests con `eventId` duplicado;
- pairing/webhook matching tests por `dynamic_user_id + wallet_id/publicKey`;
- MCP polling tests que prueben que `mcp_session_id` sin `poll_token` no puede retirar token final;
- execution idempotency tests: mismo `(mcp_session_id, idempotency_key)` no firma dos veces y retries devuelven el resultado previo;
- gas policy tests;
- audit redaction tests: ningún secret aparece en eventos/logs.

---

## 13. Validaciones pendientes antes de implementar

Estas afirmaciones son blockers de P0: no deben tratarse como verdad cerrada hasta validarlas con PoC, docs oficiales o dashboard.

- [ ] `MONAD_CHAIN_ID=10143` y nombre `monad_testnet` confirmados contra Monad docs oficiales, RPC real y Dynamic Dashboard.
- [ ] Dynamic puede crear/usar embedded EVM wallets para Monad testnet en el entorno configurado.
- [ ] La web confirma qué SDK exacto expone `delegateWaasKeyShares` en nuestro stack React/Next.
- [ ] Webhook Dynamic probado end-to-end con firma `x-dynamic-signature-256` sobre raw body, `eventId`, `walletId`, `publicKey`, `encryptedDelegatedShare` y `encryptedWalletApiKey`.
- [ ] `delegatedSignTransaction` firma una transacción compatible con Monad testnet y `viem` puede broadcast-earla con nuestro RPC.
- [ ] Storage local de token MCP validado en la máquina demo: `~/.compass/credentials.json` con permisos `0600` o keychain.
- [ ] Digest canónico review/execute validado con una tx real y un caso de mismatch bloqueado.
- [ ] Endpoint auth matrix probada con casos positivos/negativos por scope.

---

## 14. Non-goals P0

No hacer en la primera versión:

- dashboard completo de portfolio;
- CLI como interfaz principal;
- approvals por popup de wallet en cada tx;
- raw signing desde Claude;
- soporte Solana;
- multi-chain real;
- roles/equipos;
- policy marketplace;
- swaps complejos si no hay tiempo;
- threat intelligence externa obligatoria.

---

## 15. Regla de cambio

Para cambiar una decisión fundacional:

1. crear o actualizar un ADR en `docs/adr/`;
2. explicar qué regla cambia y por qué;
3. actualizar esta constitución si el cambio queda aceptado;
4. ajustar schemas/tests antes de cambiar comportamiento crítico.

La constitución gana sobre comentarios sueltos, prompts anteriores y código accidental.
