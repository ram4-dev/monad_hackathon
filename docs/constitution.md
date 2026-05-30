# Compass Monad — Constitución del Repo

**Estado:** v0.6 — P0 proxy-only, sin aprobaciones externas ni legado fuera de alcance  
**Fecha:** 2026-05-30  
**Owner:** maintainers del repo  
**Última validación externa:** 2026-05-30; Monad docs oficiales listadas en sección 14  
**Alcance:** todo el repo `compass_monad`  
**Producto:** Compass — MCP security proxy for AI agents executing on Monad

Esta constitución define las decisiones que no queremos rediscutir en cada archivo. Si código, prompts, specs o ADRs contradicen este documento, primero se actualiza esta constitución o se crea un ADR/RFC explícito.

## Quick read

- **Demo P0:** Claude Code/Claude Desktop/Codex/Cursor usan **Compass MCP Security Proxy** como única superficie MCP de ejecución.
- **Arquitectura P0:** Compass corre como MCP server frente al host y como MCP client frente a un upstream MCP.
- **Upstream inicial:** **Wallet Agent** corre detrás de Compass. El host nunca lo ve directo.
- **Chain P0:** Monad Testnet, `chain_id=10143`, `MON`, RPC configurable por `MONAD_RPC_URL`.
- **Sin aprobación humana/manual:** estamos dentro de Claude. No hay superficie visual ni firma manual del usuario por transacción. `approve_token` refiere solo a allowance on-chain.
- **Decisión runtime:** una tool call es `allow` o `block`. Si no cumple policy, no se forwardea.
- **Semántica pre-mapeada:** Compass no decide por nombre de tool ni por confianza heurística. Cada función permitida debe existir en un registry previo con efectos, campos requeridos y policy checks.
- **Nunca:** acceso directo a Wallet Agent, private keys en Claude, key-management tools, raw signing genérico, unknown writes por passthrough, o decisiones críticas basadas solo en LLM.

---

## 1. Decisiones fundacionales

| Tema              | Decisión                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Demo principal    | **Compass MCP Security Proxy** instalado como único MCP de ejecución visible para Claude Code/Claude Desktop/Codex/Cursor.                                   |
| Producto          | Compass es un security proxy para agentes. No implementa una wallet propia, chat cripto, dashboard ni UI de aprobación.                                      |
| Chain             | **Monad Testnet** P0. `chain_id=10143` confirmado por docs oficiales de Monad.                                                                               |
| RPC               | Configurable con `MONAD_RPC_URL`. Los RPC públicos oficiales son referencia, no dependencia hardcodeada.                                                     |
| Upstream          | **Wallet Agent** como primer MCP upstream por sus tools EVM-compatible. Se usa como executor detrás del gate, no como superficie directa.                    |
| Tool exposure     | Compass expone solo tools pre-mapeadas. Los nombres upstream se mantienen iguales; las meta-tools propias usan prefijo `compass_`.                           |
| Runtime decision  | `allow` forwardea al upstream. `block` corta la llamada y devuelve explicación segura. No existe aprobación externa interactiva en P0.                       |
| ERC20 allowances  | `approve_token` limitado puede forwardearse solo si `token + spender + amount + chain` están permitidos explícitamente por policy. Todo lo demás se bloquea. |
| Bypass            | El host MCP de demo no debe tener Wallet Agent configurado en paralelo. Si Claude ve Wallet Agent directo, Compass queda bypassed.                           |
| Seguridad crítica | Determinística/reglas verificables primero; el LLM puede explicar, no decidir como autoridad final.                                                          |

---

## 2. Invariantes de seguridad

Estas reglas son no negociables.

1. Claude nunca recibe private keys, key shares, wallet API keys, delegated payloads ni tokens secretos.
2. Claude no debe tener acceso directo al upstream MCP. Compass es la única interfaz visible.
3. Compass no expone tools genéricas de `sign_raw_transaction`, `send_raw_transaction`, private-key import/export o keystore unlock.
4. No hay aprobación externa, superficie visual ni firma manual del usuario por transacción en P0.
5. Toda `tools/call` pasa por:
   ```text
   input -> registered semantics -> required evidence -> simulation/inspection -> risk -> policy -> allow/block -> audit
   ```
6. Compass solo expone tools que existen en el registry de semántica. Una tool upstream no registrada se oculta o se bloquea.
7. Read-only puede proxyearse con audit si está registrado como read-only.
8. Write/signature/token approval nunca se forwardea sin evidencia mínima, simulation/inspection y policy `allow`.
9. Si Compass no puede inspeccionar lo suficiente para entender el efecto de una acción write, bloquea. No escala a aprobación humana en P0.
10. Unknown write se bloquea por default.
11. Private-key/keystore management se bloquea por default, incluso si el upstream lo ofrece.
12. Allowances ERC20 peligrosas (`uint256.max`, `setApprovalForAll`, Permit2 no allowlisted, spender/token desconocido) se bloquean por default.
13. Signatures opacas se bloquean; `sign_typed_data` requiere decoding semántico y policy explícita.
14. Chain management (`add_custom_chain`, `switch_chain`) solo se permite para Monad Testnet allowlisted (`10143`).
15. Toda ejecución write debe registrar audit con input sanitizado, semántica usada, decisión, policy snapshot, upstream result/error y audit id.
16. Logs, audit metadata y errores nunca pueden incluir secrets, private keys, raw payloads sensibles, tokens plaintext ni stack traces sensibles.
17. Toda llamada que pueda producir una transacción, firma o broadcast debe generar y auditar un `candidate_tx_digest` canónico antes de forwardear.
18. La ejecución real debe coincidir con el payload/digest revisado o debe re-simularse y re-evaluarse antes de forwardear.
19. Si una tool puede hacer broadcast/execution, `idempotency_key` o un equivalente determinístico es obligatorio. Un retry no puede producir una segunda ejecución para la misma intención.
20. Las policies son deny-by-default: permitir es una decisión explícita, auditable y reproducible.
21. Las diferencias RPC/gas/finality de Monad se tratan como requisitos de diseño, no como edge cases de Ethereum genérico.
22. Si una doc oficial de Monad contradice este documento, se pausa y se actualiza la constitución o se agrega un ADR antes de implementar.

---

## 3. Arquitectura objetivo P0

```text
Claude Code / Claude Desktop / Codex / Cursor
        |
        v
Compass MCP Security Proxy
- MCP server frente al host
- MCP client frente al upstream
- filtered tools/list from semantics registry
- tools/call interception
- required-evidence validation
- simulation / dry-run / inspection
- risk + policy decision
- append-only audit trail
        |
        v
Upstream MCP
- Wallet Agent first
        |
        v
Monad Testnet RPC
```

### 3.1 Comando objetivo

```bash
compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./policy.monad.json
```

Configuración MCP del host:

```bash
claude mcp add compass-wallet -- compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./policy.monad.json
```

Regla: no agregar Wallet Agent directo a Claude/Codex/Cursor durante la demo.

### 3.2 Ciclo de vida de una tool call

1. Compass arranca o se conecta al upstream MCP.
2. Compass ejecuta `tools/list` contra el upstream.
3. Compass compara upstream tools contra el registry local de semántica.
4. Compass expone al host solo las tools registradas y habilitadas.
5. Los nombres de tools upstream se mantienen iguales para ser transparente.
6. Las meta-tools propias usan prefijo `compass_`, por ejemplo `compass_status` o `compass_audit_events`.
7. El host llama `tools/call` sobre Compass.
8. Compass busca la semántica registrada exacta para esa función.
9. Compass valida campos requeridos y evidencia mínima.
10. Para writes/signatures/token approvals, Compass simula, dry-run o inspecciona payload antes de decidir.
11. Compass decide `allow` o `block`.
12. Solo `allow` forwardea la llamada original al upstream.
13. Compass registra audit de allow/block/error con datos redacted.

### 3.3 Redirección al MCP upstream

Compass no reimplementa Wallet Agent. Lo envuelve.

- Frente a Claude/Codex/Cursor, Compass habla como **MCP server**.
- Frente a Wallet Agent, Compass habla como **MCP client**.
- En P0 la conexión upstream es `stdio`, arrancada con `--upstream` o `COMPASS_UPSTREAM_CMD`.
- Upstream P0: `bunx wallet-agent@latest`.
- Compass consume `tools/list` del upstream, filtra contra el registry de semántica y publica al host solo las tools habilitadas.
- Cuando una llamada queda `allow`, Compass forwardea el `tools/call` original al upstream MCP por esa conexión.
- Cuando una llamada queda `block`, Compass no llama al upstream y devuelve una explicación segura al host.
- Si Wallet Agent falla la PoC de Monad, cambiar de upstream requiere ADR; no se cambia silenciosamente durante P0.

### 3.4 Alcance P0

P0 debe demostrar:

- proxy MCP funcional;
- upstream Wallet Agent aislado detrás de Compass;
- tools/list filtrado por registry;
- Monad Testnet configurada;
- semántica pre-mapeada por función;
- policy/risk/audit;
- bloqueo de private-key/key-management tools;
- bloqueo de allowance ERC20 peligrosa;
- forward de read-only y transferencia segura;
- no bypass directo al upstream.

Fuera de P0: cualquier UI/dashboard, auth flow externo, aprobaciones humanas, firma manual, mainnet, multi-chain real, pagos x402 productivos y cualquier runtime que dependa de intervención del usuario fuera de Claude.

---

## 4. Registry de semántica de tools

Compass no clasifica por nombre suelto ni por heurística de schema. El repo debe tener un registry previo, versionado y testeado que declare qué hace cada función upstream.

Reglas:

1. Una tool no registrada no se expone o se expone como bloqueada con error seguro.
2. Una tool registrada debe declarar clase, efecto de estado, campos requeridos, evidencia mínima, simulation requirement, policy checks y hashes de compatibilidad del schema upstream.
3. Si el schema upstream cambia de forma incompatible con el registry, la tool queda deshabilitada hasta actualizar el registry. La comparación mínima es por `input_schema_hash`.
4. El registry gana sobre descripciones naturales del upstream y sobre texto generado por el LLM.
5. El registry debe vivir en código, por ejemplo `back/services/risk/toolSemantics.ts`, y tener tests snapshot/contract.

### 4.1 Shape mínimo

```ts
type ToolClass =
  | "read_only"
  | "chain_management"
  | "simulation"
  | "transaction_execute"
  | "token_approval"
  | "signature"
  | "contract_write"
  | "private_key_management"
  | "unknown_write"
  | "dangerous";

type ToolSemantics = {
  registry_version: string;
  upstream: "wallet_agent";
  tool_name: string;
  exposed_name: string;
  upstream_schema_hash: `sha256:${string}`;
  input_schema_hash: `sha256:${string}`;
  tool_class: ToolClass;
  state_effect:
    | "none"
    | "local_chain_config"
    | "chain_state"
    | "signature"
    | "key_material";
  default_decision: "allow" | "block";
  requires_simulation: boolean;
  required_fields: string[];
  required_evidence: string[];
  policy_checks: string[];
  notes?: string;
};
```

### 4.2 Registry P0 para Wallet Agent

| Tool                   | Clase                 | Efecto                         | Evidencia requerida                                                                          | Decisión P0                                                         |
| ---------------------- | --------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `add_custom_chain`     | `chain_management`    | Configura chain local/upstream | `chain_id=10143`, nombre Monad Testnet, `MON`, RPC desde allowlist/env                       | Allow solo para Monad Testnet; block para otra chain                |
| `switch_chain`         | `chain_management`    | Cambia chain activa            | target `chain_id=10143`                                                                      | Allow solo Monad Testnet                                            |
| `get_wallet_info`      | `read_only`           | Lectura                        | chain activa, account/address, no write intent                                               | Allow + audit                                                       |
| `get_balance`          | `read_only`           | Lectura                        | address/account, chain `10143`                                                               | Allow + audit                                                       |
| `get_token_balance`    | `read_only`           | Lectura                        | address/account, token, chain `10143`                                                        | Allow + audit                                                       |
| `estimate_gas`         | `simulation`          | Lectura/simulación             | tx candidate (`from`, `to`, `value`, `data` si aplica), chain `10143`                        | Allow + audit                                                       |
| `simulate_transaction` | `simulation`          | Simulación                     | tx candidate completo, chain `10143`                                                         | Allow + audit                                                       |
| `dry_run_transaction`  | `simulation`          | Simulación                     | tx candidate completo, chain `10143`                                                         | Allow + audit                                                       |
| `send_transaction`     | `transaction_execute` | Broadcast/ejecución            | tx candidate completo, simulation/dry-run exitoso, digest estable, policy allow              | Allow solo si policy permite; si no, block                          |
| `transfer_token`       | `transaction_execute` | Transferencia                  | chain, from/account, token/native asset, recipient, amount, gas estimate, simulation/dry-run | Allow solo si recipient/token/amount/gas están en policy            |
| `approve_token`        | `token_approval`      | Allowance persistente          | chain, owner/account, token, spender, finite amount, spender/token allowlisted               | Allow solo con policy explícita exacta; unlimited/desconocido block |
| `sign_typed_data`      | `signature`           | Firma EIP-712                  | domain, `chainId=10143`, verifyingContract, primaryType, decoded fields, policy allow        | Allow solo para typed data mapeada; opaque block                    |

### 4.3 Tools bloqueadas por default

Estas tools no se exponen al host aunque el upstream las liste:

- `import_private_key`
- `create_encrypted_keystore`
- `unlock_keystore`
- `import_encrypted_private_key`
- `remove_private_key`
- cualquier tool de keystore/private-key management
- cualquier tool no presente en el registry P0

---

## 5. Configuración Monad

### 5.1 Testnet P0

Fuente oficial: `https://docs.monad.xyz/developer-essentials/testnets.md`.

```json
{
  "name": "Monad Testnet",
  "chain_id": 10143,
  "native_currency": {
    "name": "Monad",
    "symbol": "MON",
    "decimals": 18
  },
  "rpc_url_env": "MONAD_RPC_URL",
  "block_explorers": [
    "https://testnet.monadvision.com",
    "https://testnet.monadscan.com",
    "https://monad-testnet.socialscan.io"
  ]
}
```

RPC públicos oficiales de referencia:

- `https://testnet-rpc.monad.xyz`
- `https://rpc.ankr.com/monad_testnet`
- `https://rpc-testnet.monadinfra.com`

Regla: `MONAD_RPC_URL` manda sobre cualquier default.

### 5.2 Mainnet

Monad Mainnet usa `chain_id=143`, pero queda fuera de P0. No implementar mainnet sin ADR y policy separada.

### 5.3 Implicaciones RPC para Compass

Fuente oficial: `https://docs.monad.xyz/reference/json-rpc/overview.md`.

Compass debe tener en cuenta que Monad busca compatibilidad Geth, pero:

- `eth_sendRawTransaction` puede aceptar inicialmente txs con nonce gap o balance insuficiente por validación asíncrona.
- `eth_getTransactionByHash` no devuelve pending txs; puede devolver `null` mientras la tx esté en mempool.
- `latest` es una vista de baja latencia y puede ser especulativa/provisional.
- Para value settlement, usar o verificar contra `finalized` cuando el flujo lo requiera.
- `eth_call` y `eth_estimateGas` tienen límites por provider y pools de ejecución; failures de simulación deben convertirse en risk/policy, no en passthrough silencioso.
- `eth_maxPriorityFeePerGas` puede devolver un valor sugerido hardcodeado; gas policy debe usar límites explícitos y evidencia del provider.
- `debug_trace*` requiere trace options explícito `{}` si se usa.

---

## 6. Policy y risk P0

La policy inicial debe ser local, simple, deny-by-default y demo-friendly.

```ts
type DemoPolicy = {
  policy_id: string;
  policy_version: string;
  chain_id: 10143;
  allowed_tools: string[];
  allowed_recipients: `0x${string}`[];
  allowed_tokens: `0x${string}`[];
  allowed_spenders: Array<{
    token: `0x${string}`;
    spender: `0x${string}`;
    max_amount_atomic: string;
  }>;
  max_native_transfer_wei: string;
  max_erc20_transfer_atomic?: string;
  max_gas_cost_wei: string;
  max_fee_per_gas_wei?: string;
  block_unlimited_token_approvals: true;
  allow_unknown_tools: false;
  require_simulation_for_writes: true;
};
```

Orden de evaluación:

```text
registry primero -> evidencia/simulación -> policy -> allow/block
```

Una tool no registrada nunca llega a policy: se oculta o se bloquea antes.

Default determinístico:

1. Tool no registrada => `block`.
2. Tool registrada pero no incluida en `allowed_tools` => `block`.
3. `chain_id !== 10143` => `block`.
4. `read_only` => `allow + audit` si la semántica registrada dice `state_effect=none`.
5. `chain_management` => `allow` solo para Monad Testnet config oficial/allowlisted.
6. `simulation` => `allow + audit`.
7. Native transfers => `allow` solo si recipient está allowlisted, monto <= policy, gas <= policy y simulation/dry-run coincide.
8. ERC20 transfers => `allow` solo si token y recipient están allowlisted, monto <= policy, gas <= policy y simulation/dry-run coincide.
9. ERC20 allowances => `allow` solo si `token + spender + amount + chain` coinciden con una regla explícita en `allowed_spenders`.
10. Unlimited token approvals => `block` siempre en P0.
11. Signatures => `block` si opacas; `sign_typed_data` solo si domain, chain, verifyingContract, primaryType y campos decodificados coinciden con una policy explícita.
12. Contract writes no registrados => `block`.
13. Gas/costo por encima de policy => `block`.
14. Simulation unavailable => `block` para value transfer, token approval, signature o contract write.
15. Simulation failed => `block` salvo diagnóstico explícitamente no ejecutable.

Cada evaluación guarda `policy_id`, `policy_version` y snapshot suficiente para reproducir la decisión.

---

## 7. Schemas canónicos

Los schemas deben implementarse en Zod/TypeScript antes de usarse por MCP o core.

### 7.1 Policy decision

```ts
type PolicyDecision = {
  decision: "allow" | "block";
  reason_code: string;
  matched_policies: string[];
  policy_id: string;
  policy_version: string;
  explanation: string;
};
```

Si la acción necesita decisión humana fuera de Claude, se bloquea y se explica qué policy faltaría cambiar.

### 7.2 Guarded forward record

Compass debe guardar una decisión canónica antes de forwardear cualquier acción con side effects. Para read-only, `candidate_tx_digest` puede omitirse. Para transferencias, approvals on-chain, contract writes, signatures o broadcast, es obligatorio.

```ts
type GuardedForwardRecord = {
  forward_id: string;
  audit_event_id: string;
  tool_name: string;
  tool_class: ToolClass;
  chain_id: 10143;
  digest_version: "compass-candidate-v1";
  candidate_tx_digest?: `0x${string}`;
  covered_fields: string[];
  idempotency_key?: string; // required for any broadcast/execution tool
  simulation: SimulationResult;
  risk: RiskAssessment;
  policy: PolicyDecision;
  created_at: string;
};
```

`candidate_tx_digest` debe cubrir como mínimo: `chain_id`, `from/account`, `to`, `value`, `data`, tool name, argumentos normalizados, token/spender/amount cuando aplique, y campos de gas/fee que puedan cambiar el efecto o el costo aprobado.

### 7.3 Risk assessment

```ts
type RiskLevel = "low" | "medium" | "high" | "critical";

type RiskReason = {
  code: string;
  level: RiskLevel;
  category:
    | "chain"
    | "tool_semantics"
    | "intent_match"
    | "amount"
    | "recipient"
    | "token"
    | "token_approval"
    | "signature"
    | "contract"
    | "simulation"
    | "policy"
    | "upstream";
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

### 7.4 Simulation / inspection result

```ts
type SimulationResult = {
  status: "success" | "failed" | "unavailable" | "not_required";
  chain_id: number;
  from?: `0x${string}`;
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
  decoded_call?: DecodedCall;
  warnings: string[];
  safe_error?: SafeError;
};
```

### 7.5 Decoded call

```ts
type DecodedCall = {
  function_name?: string;
  signature?: string; // e.g. transfer(address,uint256)
  selector?: `0x${string}`;
  args?: Record<string, unknown>;
  abi_source?:
    | "known_abi"
    | "erc20_standard"
    | "wallet_agent_schema"
    | "tool_semantics_registry"
    | "unknown";
};
```

### 7.6 Safe error

```ts
type SafeError = {
  error_code:
    | "POLICY_BLOCKED"
    | "UNMAPPED_TOOL"
    | "UNSUPPORTED_CHAIN"
    | "MISSING_REQUIRED_EVIDENCE"
    | "DIGEST_MISMATCH"
    | "SIMULATION_FAILED"
    | "SIMULATION_UNAVAILABLE"
    | "UPSTREAM_UNAVAILABLE"
    | "UPSTREAM_ERROR"
    | "BROADCAST_FAILED"
    | "INTERNAL_ERROR";
  safe_message: string;
  debug_ref?: string;
};
```

Raw upstream errors deben sanitizarse antes de llegar a MCP, audit o logs visibles.

---

## 8. Audit trail

La auditoría es parte del producto, no logging accidental. P0 usa un audit trail local append-only.

Eventos mínimos P0:

- proxy iniciado;
- upstream conectado/desconectado;
- `tools/list` filtrado por registry;
- tool call recibida;
- semántica de tool resuelta;
- required evidence validada;
- simulation/dry-run ejecutado;
- risk score calculado;
- policy evaluada;
- llamada forwardeada;
- llamada bloqueada;
- upstream devolvió error;
- tx enviada/confirmada/fallida si aplica.

Schema:

```ts
type AuditEvent = {
  event_id: string;
  timestamp: string;
  source: "mcp" | "cli" | "system";
  agent_id?: string; // e.g. claude_code
  upstream_id?: string; // e.g. wallet_agent
  account_address?: `0x${string}`;
  chain_id?: number;
  tool_name?: string;
  tool_class?: ToolClass;
  candidate_tx_digest?: `0x${string}`;
  idempotency_key?: string;
  action:
    | "proxy_started"
    | "upstream_connected"
    | "tools_list_filtered"
    | "tool_call_received"
    | "tool_semantics_resolved"
    | "required_evidence_validated"
    | "simulation_executed"
    | "risk_scored"
    | "policy_evaluated"
    | "tool_call_forwarded"
    | "tool_call_blocked"
    | "upstream_error"
    | "transaction_broadcast"
    | "transaction_confirmed"
    | "transaction_failed";
  risk_level?: RiskLevel;
  policy_decision?: PolicyDecision["decision"];
  policy_id?: string;
  policy_version?: string;
  result: "success" | "blocked" | "failed" | "pending";
  metadata?: Record<string, unknown>; // allowlist por action; nunca dump libre
};
```

`metadata` debe ser allowlist por action. Nunca guardar private keys, tokens, env vars, raw sensitive payloads, stack traces sensibles ni dumps completos del upstream.

---

## 9. Estructura de carpetas recomendada

La estructura puede evolucionar, pero debe preservar el boundary proxy/core/adapters.

```text
.
├── bin/
│   └── compass-proxy.ts              # Entrypoint CLI/MCP local
│
├── mcp/
│   ├── proxy/
│   │   ├── server.ts                 # MCP server frente al host
│   │   ├── upstreamClient.ts         # MCP client stdio/http hacia upstream
│   │   ├── toolMirror.ts             # tools/list filtering + schema cache
│   │   ├── callInterceptor.ts        # tools/call gate
│   │   └── schemas.ts                # Schemas MCP/Compass
│   └── tools/
│       ├── compassStatus.ts          # Meta-tool compass_status
│       └── compassAuditEvents.ts     # Meta-tool compass_audit_events
│
├── back/
│   ├── services/
│   │   ├── adapters/
│   │   │   └── walletAgent.ts        # Upstream adapter P0
│   │   ├── evm/
│   │   │   ├── chains.ts             # Monad config + allowlist
│   │   │   ├── calldata.ts           # Decode EVM calldata/signatures
│   │   │   ├── simulation.ts         # viem/RPC fallback simulation
│   │   │   └── broadcast.ts          # Execution helpers if needed
│   │   ├── policy/
│   │   │   ├── evaluatePolicy.ts
│   │   │   └── policySchemas.ts
│   │   ├── risk/
│   │   │   ├── toolSemantics.ts      # Pre-mapped function semantics
│   │   │   ├── scoreRisk.ts
│   │   │   └── riskChecks.ts
│   │   └── audit/
│   │       └── auditLog.ts
│   └── db/                           # Local JSONL/SQLite/Postgres later
│
├── config/
│   ├── policy.monad.example.json
│   └── chains.monad.example.json
│
├── shared/
│   ├── schemas/
│   ├── types/
│   └── constants/
│
├── docs/
│   ├── constitution.md
│   ├── adr/
│   └── specs/
└── tests/
```

### Regla de imports

| Desde             | Puede importar                                 | No puede importar                        |
| ----------------- | ---------------------------------------------- | ---------------------------------------- |
| `mcp/proxy/*`     | `shared/*`, `back/services/*` seguros, MCP SDK | secrets, key material, env secret values |
| `back/services/*` | `shared/*`, server SDKs, DB/local storage      | UI internals                             |
| `shared/*`        | librerías puras                                | env vars, DB, network calls con secrets  |

---

## 10. Variables de entorno

```bash
# Monad/EVM
MONAD_CHAIN_ID=10143
MONAD_RPC_URL=
MONAD_EXPLORER_URL=https://testnet.monadscan.com

# Compass proxy
COMPASS_UPSTREAM_CMD="bunx wallet-agent@latest"
COMPASS_UPSTREAM_TRANSPORT=stdio
COMPASS_POLICY_PATH=./policy.monad.json
COMPASS_AUDIT_PATH=./.compass/audit.jsonl
COMPASS_DEMO_AGENT_ID=claude_code

# Optional local credential/cache paths; must stay outside git when used
COMPASS_HOME=~/.compass
```

Reglas:

- No leer ni loguear valores de secrets.
- `.env` nunca es fuente de documentación; la constitución documenta nombres y límites, no valores.
- `COMPASS_AUDIT_PATH` debe apuntar a un archivo append-only o tratarse como append-only por la capa de audit.

---

## 11. Testing mínimo

Antes de considerar estable una feature crítica:

- registry tests para cada tool mapeada;
- tests que prueben que tools upstream no registradas no se exponen o se bloquean;
- schema compatibility tests entre upstream `tools/list` y registry, incluyendo `input_schema_hash`;
- precedence tests: registry primero, policy después;
- policy tests para `allow`/`block`;
- risk tests para allowances ERC20 peligrosas;
- chain allowlist tests (`10143` allow, otros block por default);
- simulation fallback tests;
- calldata/typed-data decode tests;
- MCP `tools/list` filtering tests;
- MCP `tools/call` interception tests;
- blocked private-key tool tests;
- blocked unknown-write tests;
- audit redaction tests;
- upstream error sanitization tests;
- digest tests para `candidate_tx_digest` y campos cubiertos;
- idempotency tests obligatorios para cualquier tool que haga broadcast/execution;
- gas policy tests con casos por encima/debajo del límite.

---

## 12. PoC obligatorio antes de demo

Checklist P0:

1. Instalar Wallet Agent localmente.
2. Levantar `compass-proxy` con Wallet Agent como upstream.
3. Confirmar que Compass puede hacer `tools/list` al upstream.
4. Confirmar que Compass expone hacia Claude solo tools registradas/habilitadas.
5. Confirmar que cualquier tool no registrada se oculta o bloquea.
6. Ejecutar `add_custom_chain` para Monad Testnet y verificar que otra chain se bloquea.
7. Ejecutar `switch_chain` a Monad Testnet.
8. Ejecutar `get_wallet_info` y verificar `chain_id=10143`.
9. Ejecutar `get_balance` con una cuenta con MON de faucet.
10. Ejecutar `estimate_gas` para una transferencia simple.
11. Ejecutar `simulate_transaction` o `dry_run_transaction` para una transferencia simple.
12. Ejecutar `transfer_token` o `send_transaction` de monto mínimo en testnet con policy allow y verificar `candidate_tx_digest`.
13. Reintentar la misma ejecución con el mismo `idempotency_key` y verificar que no produce una segunda ejecución.
14. Ejecutar `approve_token` con `uint256.max` y verificar que Compass bloquea sin forwardear.
15. Ejecutar `approve_token` limitado con `token + spender + amount` no allowlisted y verificar block.
16. Ejecutar `approve_token` limitado con policy explícita exacta y verificar allow, solo si la demo necesita mostrar ese caso.
17. Confirmar audit local append-only para allow/block/forward, incluyendo digest cuando aplique.
18. Confirmar que el host MCP no tiene Wallet Agent directo configurado.

Criterio de éxito:

```text
Claude Code puede usar funciones de Wallet Agent sin ver Wallet Agent directamente.
Compass expone solo funciones pre-mapeadas.
Compass bloquea unknown/private-key tools y allowances ERC20 peligrosas antes del upstream.
Compass forwardea una acción segura en Monad Testnet solo cuando policy y simulation lo permiten.
```

---

## 13. Validaciones pendientes

Estas afirmaciones no deben tratarse como verdad cerrada hasta tener PoC/evidencia.

- [ ] Wallet Agent funciona end-to-end con `add_custom_chain` + Monad Testnet.
- [ ] Wallet Agent expone suficiente payload para inspeccionar/simular writes antes de forwardear.
- [ ] El registry P0 cubre todas las funciones que se van a exponer en demo.
- [ ] Cada tool mapeada tiene `input_schema_hash` validado contra `tools/list` del upstream.
- [ ] `simulate_transaction`/`dry_run_transaction` del upstream cubre los casos P0; si no, Compass usa fallback con RPC/viem.
- [ ] Gas estimation en Monad Testnet se comporta de forma estable con el provider elegido.
- [ ] `eth_sendRawTransaction`/broadcast se valida con la semántica asíncrona de Monad y se audita correctamente.
- [ ] El host MCP de demo no tiene Wallet Agent configurado en paralelo.
- [ ] `candidate_tx_digest` cubre los campos canónicos definidos y se audita antes de forwardear writes.
- [ ] Toda tool que pueda hacer broadcast/execution exige idempotencia.
- [ ] El audit local append-only no incluye secrets ni payloads sensibles.

---

## 14. Fuentes oficiales y referencias

Fuente de producto local:

- `compass_product_spec_monad_mcp_proxy_v0.2.md`

Monad docs oficiales consultadas:

- Docs index: `https://docs.monad.xyz/llms.txt`
- Monad MCP guide: `https://docs.monad.xyz/guides/monad-mcp.md`
- Network Information — Testnets: `https://docs.monad.xyz/developer-essentials/testnets.md`
- Network Information — Mainnet: `https://docs.monad.xyz/developer-essentials/network-information/index.md`
- JSON-RPC Overview: `https://docs.monad.xyz/reference/json-rpc/overview.md`

Otras referencias de producto/spec:

- Wallet Agent GitHub: `https://github.com/wallet-agent/wallet-agent`
- MCP tools specification: `https://modelcontextprotocol.io/specification/2025-06-18/server/tools`
- MCP TypeScript SDK: `https://github.com/modelcontextprotocol/typescript-sdk`

---

## 15. Regla de cambio

Para cambiar una decisión fundacional:

1. crear o actualizar un ADR en `docs/adr/`;
2. explicar qué regla cambia y por qué;
3. actualizar esta constitución si el cambio queda aceptado;
4. ajustar schemas/tests antes de cambiar comportamiento crítico.

La constitución gana sobre comentarios sueltos, prompts anteriores, código accidental y specs antiguas.
