# Compass — Product Spec

**Versión:** 0.1  
**Fecha:** 2026-05-29  
**Producto:** Compass — safety and authorization layer for AI agents operating crypto wallets  
**Dominio actual:** compass.ram4.dev

## 1. Resumen ejecutivo

Compass es una capa de seguridad y ejecución controlada para usuarios y agentes de IA que interactúan con Web3. El producto convierte intenciones en lenguaje natural en operaciones on-chain verificables, simula el impacto, calcula riesgo, explica qué va a pasar y solo permite ejecutar si la operación respeta políticas explícitas del usuario o de la organización.

La evolución correcta no es construir “un chatbot cripto”. Compass debe posicionarse como **la capa de autorización segura para agentes que operan wallets**.

La dirección del producto:

- Web app actual para usuarios humanos.
- Backend headless como núcleo de seguridad, políticas, simulación y auditoría.
- CLI para que agentes locales o usuarios técnicos puedan operar desde terminal.
- MCP server para integrarse con Claude, Codex, ChatGPT, Gemini y otros hosts compatibles.
- Dynamic como infraestructura de autenticación, embedded wallets/MPC y posible delegated signing.
- Policy engine propio de Compass como última línea de defensa antes de firmar o ejecutar.

**Principio central:** un agente puede proponer acciones, pero Compass verifica, simula, aplica políticas y decide si se bloquea, requiere aprobación humana o puede ejecutarse automáticamente.

## 2. Tesis de producto

Los agentes de IA van a operar cada vez más herramientas reales: código, cloud, pagos, wallets, contratos y protocolos financieros. El problema es que hoy los agentes pueden razonar con lenguaje natural, pero no son confiables para ejecutar acciones irreversibles sin una capa externa de control.

En Web3 esto es crítico porque:

- Las transacciones son irreversibles.
- El usuario promedio no entiende calldata, approvals, programas, contratos ni permisos.
- Las wallets actuales muestran poca información contextual.
- Los agentes pueden ser manipulados por prompt injection, instrucciones maliciosas o contexto contaminado.
- Un error de intención puede terminar en pérdida real de fondos.

**Claim de producto:** Compass permite autonomía sin entregar control ciego.

**Frase fuerte:** Compass is the safety and authorization layer for AI agents operating crypto wallets.

## 3. Problema

### 3.1 Problema del usuario final

Un usuario quiere operar cripto sin entender todos los detalles técnicos. Puede pedir acciones como:

- “Mandale 20 USDC a Nicole.”
- “Stakeá mis SOL donde rinda más.”
- “Reclamá este airdrop.”
- “Invertí parte de mi balance en este protocolo.”

Pero no puede verificar fácilmente:

- Si la dirección es correcta.
- Si el token es legítimo.
- Si está aprobando un permiso peligroso.
- Si el contrato/programa tiene historial sospechoso.
- Si el sitio intenta drenar la wallet.
- Si el agente interpretó bien la intención.
- Si la transacción real coincide con lo que pidió.

### 3.2 Problema de los agentes

Los agentes pueden generar acciones, pero no deberían tener autoridad directa para ejecutar transacciones. Un agente puede:

- Malinterpretar una instrucción.
- Ser atacado por prompt injection.
- Construir una transacción incorrecta.
- Llamar un contrato equivocado.
- Aceptar datos de una fuente no confiable.
- Perder trazabilidad de por qué tomó una decisión.

Compass debe actuar como guardrail externo: el agente propone, Compass verifica, el usuario/política autoriza.

### 3.3 Problema de las wallets

Las wallets tradicionales están diseñadas para humanos haciendo click, no para agentes autónomos. Muestran prompts de firma, pero no tienen suficiente contexto semántico ni un motor fuerte de políticas.

Compass no compite inicialmente como wallet. Compass se ubica por encima o al lado de la wallet: analiza, valida, explica y autoriza.

## 4. Usuarios objetivo

### 4.1 Usuario cripto no técnico

Persona que usa cripto pero no entiende contratos ni transacciones complejas. Necesita una interfaz natural, explicaciones claras y protección contra errores/scams.

**Dolor principal:** miedo a perder fondos por equivocarse.

### 4.2 Power user / builder Web3

Desarrollador, founder o usuario técnico que usa agentes para acelerar tareas. Quiere CLI, logs, políticas, automatización y control granular.

**Dolor principal:** quiere automatizar sin poner en riesgo wallets reales.

### 4.3 Equipos que usan agentes

Startups o equipos que quieren que agentes ejecuten operaciones con treasury, testnet, dev wallets o workflows repetitivos.

**Dolor principal:** necesitan trazabilidad, permisos, separación de roles y límites de ejecución.

### 4.4 Agentes externos

Claude, Codex, ChatGPT, Gemini, agentes propios, scripts CI/CD, bots operativos o herramientas de automation.

**Necesidad principal:** una API/MCP segura para pedir acciones sin tener acceso directo a claves privadas ni permisos ilimitados.

## 5. Posicionamiento

Compass no debe venderse como:

- Otra wallet.
- Un chatbot para cripto.
- Un dashboard de portfolio.
- Un simulador más.

Compass debe venderse como:

- Safety layer para agentic finance.
- Authorization layer para Web3 agents.
- Security checkpoint antes de firmar.
- Policy engine para wallets controladas por humanos/agentes.
- Runtime de ejecución segura para transacciones generadas por IA.

**One-liner:** Compass lets AI agents operate wallets safely by verifying intent, simulating transactions, enforcing policies, and requiring human approval when risk is high.

## 6. Estado actual

Compass hoy ya tiene una base funcional:

- Frontend y backend operando con wallet Solana.
- Autenticación/wallet embebida resuelta con Dynamic.
- Agente con checks determinísticos de seguridad basados en scripts/programas de Solana.
- El agente no ejecuta transacciones directamente; informa al usuario para que decida.
- Dominio/producto: compass.ram4.dev.

El siguiente salto no es agregar más UI. El salto es convertir Compass en una infraestructura headless de seguridad y autorización que pueda ser usada por web app, CLI, MCP y agentes externos.

## 7. Estado objetivo

Arquitectura objetivo:

```text
Agent / User / CLI / MCP Host
        |
        v
Compass Interface Layer
(Web App, CLI, MCP Server, API)
        |
        v
Compass Backend
- Auth verification
- Intent normalization
- Policy engine
- Transaction builder
- Simulation
- Risk engine
- Approval workflow
- Execution gateway
- Audit trail
        |
        v
Wallet / Signing Layer
- Dynamic Auth
- Dynamic Embedded Wallets / MPC
- Dynamic Delegated Access, if enabled
- External wallet signing, if needed
        |
        v
Blockchain
- Solana first
- EVM later if useful
```

**Regla:** ningún agente externo toca claves privadas. Ningún agente externo firma directamente. Ninguna transacción se ejecuta sin pasar por Compass.

## 8. Componentes principales

### 8.1 Compass Web App

Interfaz principal para usuarios humanos.

Debe permitir:

- Login con Dynamic.
- Ver wallets conectadas/embebidas.
- Ver balances.
- Revisar acciones propuestas por agentes.
- Ver explicación de riesgo.
- Aprobar/rechazar transacciones.
- Configurar políticas.
- Revocar sesiones, tokens y delegaciones.
- Ver historial/auditoría.

La web app no debe ser el core del producto. Debe ser una interfaz sobre el backend.

### 8.2 Compass Backend

Es el núcleo real del producto.

Responsabilidades:

- Verificar autenticación del usuario.
- Validar JWTs de Dynamic.
- Gestionar sesiones CLI/MCP.
- Normalizar intenciones.
- Construir o recibir transacciones propuestas.
- Simular transacciones.
- Calcular score de riesgo.
- Aplicar políticas.
- Decidir si una acción se bloquea, requiere aprobación o puede ejecutarse.
- Preparar transacciones para firma.
- Ejecutar vía delegated access cuando corresponda.
- Guardar auditoría inmutable.
- Exponer APIs para web, CLI y MCP.

**Regla de diseño:** toda interfaz debe ser reemplazable. El backend no debe asumir que el usuario viene de la web.

### 8.3 Compass CLI

El CLI es la interfaz para usuarios técnicos, agentes locales y automation.

Comandos propuestos:

```bash
compass login
compass logout
compass status
compass wallet list
compass wallet balance
compass intent "send 20 USDC to nicole.sol"
compass simulate --tx tx.json
compass review --intent intent.json
compass execute --intent intent.json
compass policy list
compass policy create
compass policy update
compass delegation status
compass delegation revoke
compass mcp start
```

Debe soportar salida humana y salida JSON parseable por agentes.

Ejemplo:

```bash
compass wallet balance --json
```

```json
{
  "wallet": "8aX...91p",
  "balances": [
    { "symbol": "SOL", "amount": "4.12" },
    { "symbol": "USDC", "amount": "122.50" }
  ],
  "risk_status": "clean"
}
```

### 8.4 Compass MCP Server

El MCP server permite que Claude, Codex, ChatGPT, Gemini u otros agentes pidan operaciones a Compass mediante tools controladas.

Tools mínimas:

- `parse_intent`
- `get_wallet_state`
- `get_supported_actions`
- `simulate_transaction`
- `score_risk`
- `render_compass_review`
- `prepare_unsigned_transaction`
- `request_user_approval`
- `execute_guarded_transaction`
- `record_user_decision`
- `get_audit_event`

**Regla fuerte:** MCP nunca debe exponer una tool genérica tipo `sign_transaction` sin policy check previo.

Toda tool de ejecución debe pasar por:

1. Intent binding.
2. Simulation.
3. Risk scoring.
4. Policy decision.
5. Approval si corresponde.
6. Execution.
7. Audit.

### 8.5 Risk Engine

El risk engine combina checks determinísticos, simulación, heurísticas de seguridad y explicación asistida por IA.

Checks P0:

- Chain correcta.
- Wallet correcta.
- Token correcto.
- Monto correcto.
- Dirección destino correcta.
- Program/contract allowlist/blocklist.
- Simulación exitosa.
- Cambios esperados de balance.
- Fees esperadas.
- Slippage máximo.
- Detección de approvals peligrosos.
- Detección de transferencia total o casi total.
- Detección de llamadas desconocidas.
- Detección de contratos/programas nuevos o no verificados.
- Detección de transacciones que no coinciden con la intención original.

Checks P1:

- Reputación de protocolo.
- Historial de dirección destino.
- Heurísticas anti-drainer.
- Riesgo de phishing por dominio/origen.
- Detección de token fake.
- Detección de airdrop/claim sospechoso.
- Detección de permisos persistentes.
- Detección de cambios de authority en Solana.
- Detección de instrucciones ocultas o no explicadas.

Checks P2:

- Integración con proveedores externos de threat intelligence.
- Análisis de contratos/programas con modelo especializado.
- Risk score histórico por usuario.
- Aprendizaje de preferencias del usuario.
- Detección de anomalías respecto al comportamiento normal.

### 8.6 Policy Engine

El policy engine decide qué se puede hacer sin aprobación, qué requiere aprobación y qué queda bloqueado.

Ejemplo de política:

```json
{
  "name": "Low value USDC transfers",
  "action": "transfer",
  "chain": "solana",
  "token": "USDC",
  "max_amount": "25",
  "allowed_recipients": ["nicole.sol", "8aX...91p"],
  "risk_threshold": "low",
  "requires_human_approval": false
}
```

Decisiones posibles:

- `allow`
- `require_approval`
- `require_step_up_auth`
- `block`

La política debe ser evaluada después de la simulación, no antes. Primero hay que saber qué hace realmente la transacción.

### 8.7 Execution Gateway

El execution gateway es la única parte que puede disparar una transacción real.

Antes de ejecutar debe verificar:

- La transacción actual coincide byte-for-byte con la simulada o con el hash aprobado.
- El usuario/wallet coincide.
- La sesión sigue vigente.
- Las políticas no cambiaron invalidando la acción.
- El approval no expiró.
- El riesgo no fue recalculado como más alto.
- La wallet tiene fondos suficientes.

### 8.8 Audit Trail

Toda acción debe quedar registrada.

Eventos mínimos:

- Usuario inició sesión.
- CLI autorizado.
- MCP server conectado.
- Agente propuso intención.
- Intención normalizada.
- Transacción construida.
- Simulación ejecutada.
- Risk score calculado.
- Política evaluada.
- Usuario aprobó/rechazó.
- Transacción enviada.
- Transacción confirmada/fallida.
- Delegación creada/revocada.
- Token/sesión revocada.

Ejemplo de evento:

```json
{
  "event_id": "evt_123",
  "timestamp": "2026-05-29T00:00:00Z",
  "user_id": "user_123",
  "wallet_id": "wallet_123",
  "source": "cli|web|mcp|api",
  "agent_id": "claude_desktop|null",
  "action": "transaction_approved",
  "intent_hash": "...",
  "transaction_hash": "...",
  "risk_score": 27,
  "policy_decision": "require_approval",
  "result": "approved"
}
```

La auditoría es parte del producto, no un detalle interno.

## 9. Integración con Dynamic

### 9.1 Lo validado por documentación oficial

Dynamic soporta autenticación, emisión de JWTs y embedded wallets con MPC.

Dynamic documenta un flujo ClientGrant compatible conceptualmente con CLI:

- El cliente inicia un grant.
- Recibe `grant_code`, `user_code`, `verification_uri`, `verification_uri_complete`, expiración e intervalo de polling.
- El usuario aprueba desde browser/dashboard.
- El cliente hace polling con `grant_code`.
- Si se aprueba, recibe un JWT.
- `client_type` soporta `cli`, `mcp`, `ide-plugin`, `demo` y `other`.

Dynamic también documenta que el backend debe verificar criptográficamente los JWTs emitidos por Dynamic antes de confiar en los claims.

Dynamic documenta embedded wallets con MPC.

Dynamic documenta Delegated Access para que un servidor pueda firmar mensajes/transacciones en nombre del usuario con permiso previo, recibiendo credenciales/delegated share vía webhook.

### 9.2 Riesgo/ambigüedad

El flujo ClientGrant aparece en documentación pública, pero el wording menciona “first-party client” y ejemplos como Dynamic CLI, MCP server o IDE plugin. Hay que validar con PoC si Compass, como app tercera, puede usarlo directamente para login de usuarios finales o si está pensado para clientes first-party dentro del ecosistema Dynamic.

Esto define el diseño final de `compass login`.

### 9.3 Camino recomendado

Implementar dos caminos.

#### Camino A — ClientGrant directo

Ideal si Dynamic permite usar ClientGrant para Compass CLI.

```text
compass login
  -> POST Dynamic /auth/grant/code with client_type=cli
  -> CLI muestra verification_uri_complete y user_code
  -> Usuario aprueba en browser
  -> CLI poll /auth/grant/token con grant_code
  -> CLI recibe JWT
  -> CLI guarda token en keychain
  -> CLI llama a Compass backend con Bearer token
  -> Compass backend verifica JWT Dynamic
```

#### Camino B — Browser handoff propio de Compass

Fallback si ClientGrant no sirve para terceros.

```text
compass login
  -> CLI abre https://app.compass.ram4.dev/cli-login?device_id=...
  -> Usuario se loguea con Dynamic en Compass Web
  -> Compass backend verifica Dynamic JWT
  -> Compass backend emite Compass CLI token corto
  -> CLI recibe token vía local callback o polling
  -> CLI guarda token en keychain
```

Este fallback es más controlable y probablemente suficiente para MVP.

## 10. Flujos de autenticación

### 10.1 Web login

```text
User -> Compass Web -> Dynamic Auth -> Dynamic JWT -> Compass Backend verifies JWT -> Session created
```

Requisitos:

- JWT enviado como Bearer token.
- Backend verifica firma, issuer, expiración y claims relevantes.
- No confiar en claims decodificados del cliente sin verificación.
- Refresh/re-auth cuando expire.

### 10.2 CLI login con Dynamic ClientGrant

```text
CLI -> Dynamic ClientGrant code
CLI <- grant_code + user_code + verification_uri_complete
User -> Browser approval
CLI -> Dynamic polling
CLI <- JWT
CLI -> Compass Backend
Backend -> Verify Dynamic JWT
```

Requisitos:

- Guardar token en keychain del sistema, no en archivo plano.
- Soportar logout/revoke.
- Respetar `interval` de polling.
- Manejar `authorization_pending`, `slow_down`, `approved`, `access_denied`, `expired_token`.
- Mostrar claramente el hostname/nombre del cliente que se está autorizando.

### 10.3 MCP auth

Opción recomendada:

- El MCP server corre localmente.
- Usa el token del CLI o inicia su propio flujo de login.
- Cada tool call va autenticada contra Compass backend.
- Compass backend registra `source=mcp` y `agent_id`.

No permitir que el MCP server guarde tokens en texto plano.

## 11. Flujos de transacción

### 11.1 Manual approval flow — MVP seguro

```text
1. Usuario/agente expresa intención.
2. Compass normaliza intención.
3. Compass construye o recibe unsigned transaction.
4. Compass simula.
5. Compass calcula riesgo.
6. Compass evalúa políticas.
7. Si requiere aprobación, muestra review.
8. Usuario aprueba.
9. Wallet firma.
10. Compass registra auditoría.
```

Este flujo debe ser el MVP principal. Es más fácil de defender y reduce riesgo.

### 11.2 Delegated execution flow — autonomía controlada

```text
1. Usuario crea delegación limitada.
2. Dynamic entrega credenciales/delegated share al backend vía webhook.
3. Backend guarda credenciales en storage seguro.
4. Agente propone acción.
5. Compass simula, calcula riesgo y aplica políticas.
6. Si políticas permiten ejecución automática, backend firma vía delegated access.
7. Compass envía transacción.
8. Compass registra auditoría.
```

Este flujo es el futuro del producto, pero no debe ser el primer paso si todavía no hay suficiente seguridad.

Condición para permitirlo:

- Políticas estrictas.
- Límites de monto.
- Allowlist de acciones/protocolos.
- Revocación simple.
- Auditoría clara.
- Alertas ante anomalías.
- Step-up auth para cambios sensibles.

### 11.3 Blocked flow

```text
Intent -> Simulation -> Risk high / Policy block -> No signing -> Explanation -> Audit
```

Compass debe bloquear agresivamente cuando:

- No puede simular.
- La transacción no coincide con la intención.
- El contrato/programa es desconocido y el monto es relevante.
- Hay approvals peligrosos.
- Hay transferencia de fondos no esperada.
- Hay cambios de authority.
- Hay señales de drainer/phishing.

## 12. Modelo de datos

### 12.1 User

```json
{
  "id": "user_123",
  "dynamic_user_id": "...",
  "email": "...",
  "created_at": "...",
  "status": "active"
}
```

### 12.2 Wallet

```json
{
  "id": "wallet_123",
  "user_id": "user_123",
  "dynamic_wallet_id": "...",
  "chain": "solana",
  "address": "...",
  "type": "embedded|external",
  "status": "active"
}
```

### 12.3 Session

```json
{
  "id": "sess_123",
  "user_id": "user_123",
  "source": "web|cli|mcp|api",
  "device_name": "MacBook Pro",
  "created_at": "...",
  "expires_at": "...",
  "revoked_at": null
}
```

### 12.4 Intent

```json
{
  "id": "intent_123",
  "user_id": "user_123",
  "source": "mcp",
  "raw_text": "send 20 USDC to Nicole",
  "normalized_action": "transfer",
  "chain": "solana",
  "asset": "USDC",
  "amount": "20",
  "recipient": "...",
  "confidence": 0.94,
  "status": "parsed"
}
```

### 12.5 TransactionProposal

```json
{
  "id": "txp_123",
  "intent_id": "intent_123",
  "wallet_id": "wallet_123",
  "chain": "solana",
  "unsigned_tx": "...",
  "tx_hash_preimage": "...",
  "status": "created"
}
```

### 12.6 Simulation

```json
{
  "id": "sim_123",
  "transaction_proposal_id": "txp_123",
  "status": "success|failed|unknown",
  "balance_deltas": [
    { "asset": "USDC", "amount": "-20" },
    { "asset": "SOL", "amount": "-0.00001" }
  ],
  "programs_called": ["..."],
  "warnings": []
}
```

### 12.7 RiskAssessment

```json
{
  "id": "risk_123",
  "simulation_id": "sim_123",
  "score": 18,
  "level": "low",
  "reasons": [
    "Recipient is in allowlist",
    "Amount is under policy limit",
    "Simulation matches user intent"
  ],
  "blocking_findings": []
}
```

### 12.8 PolicyDecision

```json
{
  "id": "poldec_123",
  "risk_assessment_id": "risk_123",
  "decision": "allow|require_approval|require_step_up_auth|block",
  "matched_policies": ["policy_123"],
  "explanation": "Allowed because amount is under 25 USDC and recipient is allowlisted."
}
```

## 13. API mínima

### 13.1 Auth

```http
POST /auth/cli/start
POST /auth/cli/poll
POST /auth/logout
GET  /auth/session
```

### 13.2 Wallets

```http
GET /wallets
GET /wallets/{walletId}
GET /wallets/{walletId}/balances
```

### 13.3 Intents

```http
POST /intents
GET  /intents/{intentId}
POST /intents/{intentId}/normalize
```

### 13.4 Transactions

```http
POST /transactions/propose
POST /transactions/{proposalId}/simulate
POST /transactions/{proposalId}/review
POST /transactions/{proposalId}/approve
POST /transactions/{proposalId}/execute
GET  /transactions/{proposalId}
```

### 13.5 Policies

```http
GET    /policies
POST   /policies
GET    /policies/{policyId}
PATCH  /policies/{policyId}
DELETE /policies/{policyId}
POST   /policies/evaluate
```

### 13.6 Delegations

```http
GET    /delegations
POST   /delegations/request
POST   /delegations/webhook/dynamic
POST   /delegations/{delegationId}/revoke
GET    /delegations/{delegationId}/status
```

### 13.7 Audit

```http
GET /audit/events
GET /audit/events/{eventId}
GET /audit/intents/{intentId}
GET /audit/transactions/{proposalId}
```

## 14. Security model

### 14.1 Principios

- No private keys en agentes.
- No private keys en CLI.
- No tokens server-side de Dynamic en clientes.
- No ejecución sin simulación.
- No ejecución si no se puede explicar la acción.
- No ejecución si la transacción cambió después de la aprobación.
- No confianza en el LLM como autoridad final.
- No confianza en tokens sin verificación criptográfica.
- Revocación siempre visible y simple.
- Logs sin secretos.

### 14.2 Amenazas principales

#### Prompt injection

Un sitio, contrato, README, token metadata o mensaje externo puede intentar manipular al agente.

Control:

- El agente no firma.
- Compass valida intención contra transacción real.
- Compass ignora instrucciones no autorizadas en metadata externa.
- Se separa contexto no confiable de instrucciones del usuario.

#### Transaction mutation

Una transacción simulada puede diferir de la transacción ejecutada.

Control:

- Hash/pinning de transacción aprobada.
- Re-simulation si cambia cualquier byte.
- Expiración de approvals.

#### Token leakage

JWT o CLI token filtrado.

Control:

- Keychain local.
- Tokens cortos.
- Revocación.
- Device/session registry.
- Scope mínimo.
- Step-up para acciones sensibles.

#### Delegated signing abuse

Una delegación podría permitir firmas no deseadas.

Control:

- Delegaciones limitadas por monto, acción, protocolo, tiempo y riesgo.
- Reglas deny-by-default.
- Alertas.
- Revocación inmediata.
- Storage seguro de delegated credentials.

#### Dynamic API token exposure

El API key server-side de Dynamic no puede aparecer en CLI, frontend ni MCP.

Control:

- Solo backend puede tener server API key.
- Secret manager.
- Rotación.
- Scopes mínimos.

## 15. UX del review de seguridad

Compass debe mostrar una revisión clara, no técnica de más, pero verificable.

Ejemplo low risk:

```text
Action: Transfer 20 USDC
From: Your wallet 8aX...91p
To: Nicole / 7bQ...abc
Network: Solana
Estimated fee: 0.00001 SOL

What will change:
- USDC: -20
- SOL: -0.00001 fee

Risk: Low
Why:
- Recipient is in your allowlist
- Token is verified USDC
- No approvals or authority changes detected
- Simulation matches your original intent

Decision:
Allowed by policy: Low value USDC transfers
```

Ejemplo blocked:

```text
Risk: Critical
Blocked

Why:
- Transaction requests permission beyond the stated intent
- Program is unknown
- Simulation shows unexpected token movement
- This does not match: “claim airdrop”

Compass will not execute this transaction.
```

## 16. MVP recomendado

El MVP no debe intentar autonomía total. Debe demostrar control, seguridad e integración con agentes.

### P0 — MVP real

- Web login con Dynamic.
- Backend verifica Dynamic JWT.
- CLI login con ClientGrant o fallback Compass browser handoff.
- Wallet list/balance desde CLI.
- MCP server local básico.
- Tool MCP `get_wallet_state`.
- Tool MCP `simulate_transaction`.
- Tool MCP `score_risk`.
- Tool MCP `request_user_approval`.
- Simulación Solana.
- Risk score determinístico v1.
- Policy engine v1.
- Manual approval.
- Audit trail.
- Bloqueo si no se puede simular.

### P1 — Producto fuerte

- Delegated Access limitado.
- Auto-execution para acciones low-risk.
- Políticas editables por usuario.
- Revocación de delegaciones.
- Dashboard de sesiones CLI/MCP.
- Alertas ante actividad sospechosa.
- JSON output estable para agentes.
- Reputación de contratos/programas.
- Human-readable transaction diff.

### P2 — Expansión

- Integración con Codex/Claude Code para desarrollo seguro Web3.
- Soporte EVM.
- Organización/equipos.
- Roles y approvals multi-firma.
- Threat intelligence externa.
- Modelo especializado en seguridad Web3/finance.
- Marketplace de policies/templates.
- CI/CD security checks para smart contracts.

## 17. Roadmap sugerido

### Fase 1 — Headless backend + CLI read-only

Objetivo: que Compass deje de depender de la web.

Entregables:

- Auth backend sólida.
- CLI `login/status/logout`.
- CLI `wallet list/balance`.
- Verificación de JWT Dynamic.
- Registro de sesiones.
- Audit básico.

Criterio de éxito: un usuario puede autenticarse desde terminal y consultar estado de wallet sin exponer claves.

### Fase 2 — Simulation + risk review

Objetivo: que Compass pueda analizar una transacción propuesta.

Entregables:

- Endpoint `transactions/propose`.
- Simulación Solana.
- Risk engine v1.
- CLI `simulate/review`.
- JSON schema estable.

Criterio de éxito: un agente puede pasar una transacción y Compass devuelve risk score + explicación + decisión.

### Fase 3 — MCP integration

Objetivo: que agentes usen Compass como tool segura.

Entregables:

- MCP server local.
- Tools P0.
- Output compatible con agentes.
- Audit con `source=mcp`.

Criterio de éxito: Claude/Codex puede consultar wallet, proponer acción y recibir review de Compass sin firmar nada.

### Fase 4 — Manual execution

Objetivo: completar flujo de ejecución humana.

Entregables:

- Approval UI.
- Transaction pinning.
- Firma con wallet.
- Execution status.
- Historial completo.

Criterio de éxito: una acción propuesta por agente puede terminar en transacción firmada por usuario después de review.

### Fase 5 — Delegated execution limitada

Objetivo: autonomía real pero acotada.

Entregables:

- Dynamic Delegated Access PoC.
- Delegation registry.
- Límites de monto/acción/protocolo.
- Auto-execute para low-risk.
- Revocación.

Criterio de éxito: Compass puede ejecutar automáticamente una acción de bajo riesgo permitida por policy, sin aprobación manual en cada operación.

## 18. Métricas de producto

### Seguridad

- % de transacciones bloqueadas correctamente.
- % de transacciones con simulación exitosa.
- Falsos positivos de bloqueo.
- Falsos negativos detectados manualmente.
- Tiempo promedio de review.
- Cantidad de approvals peligrosos detectados.

### Uso

- Usuarios activos semanales.
- Wallets conectadas.
- Transacciones revisadas.
- Transacciones ejecutadas.
- CLI sessions activas.
- MCP tool calls por usuario.
- Policies creadas por usuario.

### Confianza

- % de usuarios que aprueban después del review.
- % de usuarios que cancelan por advertencia de Compass.
- Tiempo hasta primera transacción segura.
- Retención de usuarios que usaron Compass para bloquear algo.

### Developer adoption

- Instalaciones CLI.
- MCP servers activos.
- Integraciones con agentes.
- API calls por workspace.

## 19. Decisiones de diseño importantes

### 19.1 No empezar con autonomía total

Autonomía total suena más impresionante, pero es más difícil de defender. El MVP debe priorizar trust.

Primero: agente propone, Compass revisa, humano aprueba.

Después: políticas estrictas permiten ejecución automática.

### 19.2 No depender del LLM para seguridad crítica

El LLM puede explicar, resumir y ayudar a clasificar. Pero los bloqueos críticos deben ser determinísticos o basados en reglas verificables.

La IA puede decir “esto parece sospechoso”. La política debe decidir “esto se bloquea porque viola X”.

### 19.3 Backend como producto real

La UI puede cambiar. El CLI puede cambiar. MCP puede cambiar.

El asset defensible es:

- Risk engine.
- Policy engine.
- Audit trail.
- Integraciones de wallet/signing.
- Execution gateway seguro.

### 19.4 Compass debe ser chain-aware, no chain-limited

Solana primero está bien. Pero el diseño debe permitir EVM después.

Abstracciones necesarias:

- Chain.
- Asset.
- Wallet.
- Transaction proposal.
- Simulation provider.
- Risk checks por chain.
- Signing provider.

## 20. Open questions

### Dynamic / Auth

- ¿ClientGrant puede ser usado por Compass como app tercera para login de usuarios finales?
- ¿Qué scopes/claims trae el JWT emitido por ClientGrant?
- ¿Ese JWT representa un dashboard user, un app user o un authorized client?
- ¿Se puede usar directamente contra wallets del usuario o solo contra recursos de Dynamic?
- ¿Cuál es el flujo recomendado por Dynamic para CLI de una app customer?

### Dynamic / Delegated Access

- ¿Delegated Access está disponible para Solana con el mismo nivel de soporte que EVM?
- ¿Qué operaciones exactas soporta en Solana?
- ¿Cómo se revoca desde user-facing UI?
- ¿Qué límites/policies se pueden imponer nativamente en Dynamic?
- ¿Qué debe implementar Compass encima?

### Producto

- ¿El primer usuario objetivo es consumidor cripto o builder/agent developer?
- ¿Compass cobra por usuario, por wallet, por transacción revisada, por MCP/API usage o por workspace?
- ¿El foco inicial es Solana retail o agentic devtools?
- ¿El pitch principal es safety para usuarios o infra para agentes?

### Seguridad

- ¿Qué nivel de riesgo permite auto-execution?
- ¿Qué checks son hard-blockers?
- ¿Cómo se manejan errores de simulación?
- ¿Cómo se prueba que la transacción ejecutada coincide con la aprobada?
- ¿Qué información se guarda en audit sin exponer privacidad?

## 21. PoC técnico inmediato

### 21.1 PoC ClientGrant

Objetivo: validar si `compass login` puede usar Dynamic ClientGrant directamente.

Pasos:

1. Crear endpoint/script que llame `/auth/grant/code` con `client_type=cli`.
2. Mostrar `verification_uri_complete` y `user_code`.
3. Aprobar desde browser.
4. Hacer polling con `grant_code`.
5. Verificar si llega JWT.
6. Decodificar claims sin confiar todavía.
7. Validar JWT en backend con public key/JWKS.
8. Confirmar si el user corresponde al usuario de Compass.

Resultado esperado:

- Si funciona: usar ClientGrant como login oficial CLI.
- Si no funciona: usar fallback de Compass browser handoff.

### 21.2 PoC MCP

Objetivo: validar que un agente pueda usar Compass sin tocar claves.

Tools mínimas:

- `get_wallet_state`
- `simulate_transaction`
- `score_risk`
- `render_review`

Resultado esperado:

- Claude/Codex puede pedir estado y review de transacción.
- No existe tool de firma directa.

### 21.3 PoC Delegated Access

Objetivo: validar firma controlada server-side.

Pasos:

1. Usuario aprueba delegación en web.
2. Dynamic envía credenciales al webhook.
3. Compass guarda credenciales de forma segura.
4. Compass firma una acción de testnet bajo policy estricta.
5. Compass revoca delegación.

Resultado esperado:

- Firma server-side funciona solo bajo políticas.
- Revocación corta capacidad de firma.

## 22. Pricing posible

No definir todavía como definitivo, pero opciones:

### Consumer

- Free: reviews limitados, manual approval.
- Pro: políticas avanzadas, CLI, historial extendido.

### Developer / Agent

- Free dev: testnet, limited API calls.
- Pro: MCP + CLI + mainnet reviews.
- Usage-based: por transacción simulada/revisada.

### Teams

- Workspace mensual.
- Políticas compartidas.
- Roles y approvals.
- Audit export.
- Límites por wallet/team.

El pricing más lógico a futuro probablemente sea B2B/devtool: cobrar por workspace + usage de reviews/simulations/executions.

## 23. Qué tiene que demostrar Compass para ganar

Compass gana si demuestra estas 4 cosas:

1. El agente puede operar cripto sin tener la key.
2. Compass entiende qué va a pasar realmente en la transacción.
3. Compass puede bloquear acciones peligrosas antes de firmar.
4. Compass puede habilitar autonomía limitada con políticas y auditoría.

Demo ideal:

```text
1. Usuario conecta wallet con Dynamic.
2. Usuario abre Claude/Codex con Compass MCP.
3. Agente intenta ejecutar una acción simple.
4. Compass simula y aprueba porque es low risk.
5. Agente intenta ejecutar una acción sospechosa.
6. Compass bloquea y explica el motivo.
7. Usuario ve audit trail completo.
8. Usuario configura una policy.
9. Compass ejecuta automáticamente una acción chica permitida.
```

## 24. Definición de “bueno” para el MVP

El MVP está bien si:

- No gestiona claves privadas.
- No firma desde el agente.
- Tiene auth CLI funcional.
- Tiene MCP funcional.
- Simula transacciones.
- Explica cambios de balance.
- Bloquea riesgos obvios.
- Tiene políticas básicas.
- Tiene audit trail.
- Permite una demo clara de agente -> Compass -> review -> aprobación -> ejecución.

El MVP está mal si:

- Es solo una UI linda.
- El agente puede firmar directamente.
- No hay simulación.
- No hay policies.
- El risk score es solo un prompt al LLM.
- No hay revocación.
- No hay trazabilidad.

## 25. Fuentes oficiales de Dynamic usadas

- Dynamic ClientGrant — initiate a client grant request: https://www.dynamic.xyz/docs/api-reference/clientgrant/initiate-a-client-grant-request
- Dynamic ClientGrant — approve or deny a pending client grant: https://www.dynamic.xyz/docs/api-reference/clientgrant/approve-or-deny-a-pending-client-grant
- Dynamic ClientGrant — poll for the result of a client grant: https://www.dynamic.xyz/docs/api-reference/clientgrant/poll-for-the-result-of-a-client-grant
- Dynamic authentication tokens: https://www.dynamic.xyz/docs/overview/authentication/tokens
- Dynamic CLI overview: https://www.dynamic.xyz/docs/overview/cli/overview
- Dynamic Node SDK quickstart: https://www.dynamic.xyz/docs/node/quickstart
- Dynamic Delegated Access overview: https://www.dynamic.xyz/docs/overview/wallets/embedded-wallets/mpc/delegated-access/overview
- Dynamic Node SDK EVM Delegated Access: https://www.dynamic.xyz/docs/node/evm/delegated-access

## 26. Conclusión

Compass debe construirse como infraestructura de seguridad para agentic finance, no como una wallet más.

La arquitectura correcta es:

- Dynamic para auth/wallet/MPC/delegated access.
- Compass backend para seguridad, políticas, simulación, auditoría y autorización.
- CLI/MCP como interfaces para agentes.
- Web app como centro de control humano.

Prioridad inmediata:

```text
CLI login -> wallet state -> agent request -> simulation -> risk score -> policy decision -> human approval -> execution/audit
```

Una vez que eso funcione, Delegated Access convierte Compass en algo mucho más fuerte: una capa donde los usuarios pueden delegar capacidad limitada a agentes sin entregarles control total de la wallet.

Ese es el producto.
