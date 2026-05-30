# Compass — Product Spec

**Versión:** 0.2  
**Fecha:** 2026-05-30  
**Producto:** Compass — MCP security proxy for AI agents operating crypto wallets on Monad  
**Dominio actual:** compass.ram4.dev

## 1. Resumen ejecutivo

Compass es una capa de seguridad y ejecución controlada para usuarios y agentes de IA que interactúan con Web3. El producto convierte intenciones en lenguaje natural en operaciones on-chain verificables, simula el impacto, calcula riesgo, explica qué va a pasar y solo permite ejecutar si la operación respeta políticas explícitas del usuario o de la organización.

La evolución correcta no es construir “un chatbot cripto”. Compass debe posicionarse como **la capa de autorización segura para agentes que operan wallets**.

La dirección del producto para la Monad Hackathon cambia de “construir toda la wallet/transaction stack” a **envolver wallets MCP existentes con una capa de seguridad transparente**.

- Compass MCP Proxy como interfaz principal frente a Claude Code, Claude Desktop, Codex, Cursor y otros hosts compatibles.
- Wallet Agent como upstream inicial para firma, envío, simulación y operaciones EVM.
- Monad Testnet como chain foco del MVP.
- Backend/headless core para políticas, clasificación de tools, simulación, risk scoring, aprobación y auditoría.
- Web app opcional como panel de aprobación, políticas e historial.
- Dynamic queda como línea futura para auth/wallet embedded/delegated access, no como dependencia P0 de la hackathon.

**Principio central:** Claude no debe hablar directo con la wallet. Claude solo ve Compass. Compass espeja las tools del wallet MCP, aplica seguridad y solo forwardea al upstream si la acción pasa policy/risk/simulation.

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

Nuevo foco para Monad Hackathon:

- No construir una wallet desde cero.
- No reimplementar todas las tools de transacción.
- Construir un **MCP security proxy** que se coloca entre Claude y un wallet MCP existente.
- Usar **Wallet Agent** como primer upstream porque expone tools útiles para Compass: `add_custom_chain`, `switch_chain`, `get_balance`, `send_transaction`, `estimate_gas`, `simulate_transaction`, `transfer_token`, `approve_token`, `sign_typed_data`, `write_contract` y `dry_run_transaction`.

El siguiente salto no es agregar más UI. El salto es convertir Compass en una infraestructura headless de seguridad y autorización que pueda envolver cualquier wallet MCP y volverlo seguro.

## 7. Estado objetivo

Arquitectura objetivo:

```text
Claude Code / Claude Desktop / Codex / Cursor
        |
        v
Compass MCP Security Proxy
- mirrors upstream tools
- intercepts tools/call
- classifies risk
- enforces policy
- requests approval when needed
- records audit
        |
        v
Upstream Wallet MCP
- Wallet Agent first
- Browser wallet signer later
- Dynamic/embedded wallet later
        |
        v
Monad Testnet / Monad Mainnet later
```

**Regla:** el agente externo no debe ver una tool raw de firma si puede evitarse. El usuario instala Compass como MCP server visible. Wallet Agent corre detrás de Compass como upstream controlado. Ninguna acción write se forwardea al wallet MCP si Compass no pudo clasificarla, simularla o evaluarla según policy.

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

### 8.4 Compass MCP Security Proxy

El componente principal para la Monad Hackathon es un MCP proxy transparente.

Compass debe comportarse como:

1. **MCP server frente a Claude/Codex/Cursor.**
2. **MCP client frente a Wallet Agent u otro wallet MCP upstream.**

El proxy no reimplementa todas las tools. En cambio:

1. Arranca o se conecta al upstream MCP.
2. Llama `tools/list` al upstream.
3. Espeja las mismas tools hacia Claude, con nombres iguales o prefijados.
4. Intercepta cada `tools/call`.
5. Clasifica la tool: `read_only`, `transaction_execute`, `approval`, `signature`, `contract_write`, `unknown_write`, `dangerous`.
6. Aplica policy/risk/simulation según la clase.
7. Si pasa, forwardea la llamada original al upstream.
8. Si no pasa, bloquea y devuelve una respuesta explicable al agente.
9. Registra auditoría.

Ejemplo de arquitectura:

```text
Claude Code
   |
   | tools/call: approve_token(...)
   v
Compass MCP Proxy
   |
   | classify -> approval
   | detect unlimited approval
   | policy -> block
   v
No forward to Wallet Agent
```

Ejemplo permitido:

```text
Claude Code
   |
   | tools/call: get_balance(...)
   v
Compass MCP Proxy
   |
   | classify -> read_only
   | policy -> allow
   v
Wallet Agent get_balance(...)
```

**Regla fuerte:** si Compass no puede inspeccionar lo suficiente para entender el efecto de una acción write, debe bloquear o requerir aprobación humana fuerte. No alcanza con confiar en la descripción natural de la tool.

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
- Detección de cambios de permisos/allowances, owners, admins o delegates en EVM/Monad.
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
  "name": "Low value USDC transfers on Monad",
  "action": "transfer_token",
  "chain_id": 10143,
  "token": "USDC",
  "max_amount": "25",
  "allowed_recipients": ["0xRecipient..."],
  "risk_threshold": "low",
  "requires_human_approval": false,
  "block_unlimited_approvals": true
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

### 8.9 Upstream Wallet MCP Adapter

Compass debe tener un adapter genérico para hablar con MCP servers upstream. El primer upstream elegido es **Wallet Agent**.

Responsabilidades:

- Arrancar el upstream como subprocess o conectarse a un proceso existente.
- Ejecutar `tools/list` y cachear schemas.
- Reexponer tools hacia el MCP host.
- Forwardear `tools/call` solo después de security gate.
- Traducir errores upstream a respuestas útiles para el agente.
- Registrar input, decisión, output y hash/audit id.

Comando objetivo:

```bash
compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./policy.monad.json
```

Configuración en Claude Code:

```bash
claude mcp add compass-wallet -- compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./policy.monad.json
```

El usuario no debe agregar Wallet Agent directamente a Claude. Si Claude puede acceder a Wallet Agent y a Compass en paralelo, existe bypass.

### 8.10 Tool Classification Layer

Compass no puede tratar todas las tools igual. Debe clasificarlas antes de decidir.

Clases mínimas:

- `read_only`: `get_balance`, `get_wallet_info`, `get_token_balance`, `get_transaction_status`, `read_contract`. Default: allow + audit.
- `chain_management`: `add_custom_chain`, `switch_chain`. Default: allow solo si chain está en allowlist.
- `transaction_execute`: `send_transaction`, `transfer_token`, `write_contract`. Default: simulate + policy.
- `approval`: `approve_token`, `setApprovalForAll`, Permit2 approvals. Default: block unlimited; limited approvals require policy.
- `signature`: `sign_message`, `sign_typed_data`. Default: require typed-data decoding or approval; block opaque signatures.
- `simulation`: `estimate_gas`, `simulate_transaction`, `dry_run_transaction`, `simulate_contract_call`. Default: allow + audit.
- `private_key_management`: `import_private_key`, `unlock_keystore`, `create_encrypted_keystore`. Default: block from agent unless explicitly enabled for local testnet.
- `unknown_write`: cualquier tool que pueda modificar estado pero no sea entendida. Default: block or require strong approval.

Regla de seguridad:

```text
read-only can be proxied
write requires simulation/policy
signature requires semantic decoding
private-key management is blocked by default
unknown write is blocked by default
```

## 9. Integración con Monad y Wallet Agent

### 9.1 Decisión técnica

Para la Monad Hackathon, Compass debe usar **Wallet Agent** como primer upstream MCP.

Motivo:

- Wallet Agent ya es un MCP server para interacciones Web3 en chains EVM-compatible.
- Tiene instalación directa en Claude Code.
- Expone tools read/write suficientemente granulares para que Compass pueda interceptarlas.
- Soporta custom chains mediante `add_custom_chain`.
- Expone tools útiles para seguridad: `estimate_gas`, `simulate_transaction`, `dry_run_transaction`, `simulate_contract_call`, `approve_token`, `transfer_token`, `send_transaction`, `sign_typed_data`.

No es perfecto para producción porque Wallet Agent se declara beta y no auditado. Para hackathon/testnet es una base razonable.

### 9.2 Validación de compatibilidad con Monad

Validación documental:

1. Wallet Agent soporta custom EVM-compatible chains mediante `add_custom_chain`.
2. Monad es Ethereum/EVM-compatible y preserva compatibilidad RPC tipo Ethereum.
3. Monad testnet usa ChainConfig `testnet` con chain id `10143`.
4. Monad mainnet usa chain id `143`.

Conclusión:

```text
Wallet Agent no trae Monad built-in,
pero debería funcionar con Monad usando add_custom_chain
porque Monad es EVM/RPC-compatible.
```

Estado de certeza:

- **Confirmado por documentación:** compatibilidad conceptual.
- **No confirmado todavía:** PoC runtime end-to-end ejecutando Wallet Agent contra Monad Testnet.

Esta distinción importa: en el pitch podemos decir “Compass wraps Wallet Agent and configures Monad as a custom EVM chain”, pero internamente debemos ejecutar PoC antes de asumir que todas las tools funcionan sin edge cases.

### 9.3 Configuración de Monad Testnet

La configuración no debe hardcodear un único RPC público. Debe aceptar `MONAD_RPC_URL` para poder usar QuickNode, Ankr, Monad Foundation, Alchemy u otro provider.

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
  "block_explorer": "https://testnet.monadscan.com"
}
```

Para mainnet futuro:

```json
{
  "name": "Monad Mainnet",
  "chain_id": 143,
  "native_currency": {
    "name": "Monad",
    "symbol": "MON",
    "decimals": 18
  },
  "rpc_url_env": "MONAD_MAINNET_RPC_URL"
}
```

### 9.4 Tools de Wallet Agent que Compass debe envolver

P0:

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

P1:

- `read_contract`
- `write_contract`
- `simulate_contract_call`
- `load_wagmi_config`
- `analyze_wagmi_contract`
- `extract_wagmi_abi`

Bloqueadas por defecto:

- `import_private_key`
- `create_encrypted_keystore`
- `unlock_keystore`
- `import_encrypted_private_key`
- `remove_private_key`
- cualquier tool de keystore/private key management

### 9.5 Security gate por tool

| Clase | Tools ejemplo | Decisión por defecto |
|---|---|---|
| Read-only | `get_balance`, `get_token_balance`, `read_contract` | Allow + audit |
| Chain management | `add_custom_chain`, `switch_chain` | Allow solo para Monad allowlisted |
| Simulation | `estimate_gas`, `simulate_transaction`, `dry_run_transaction` | Allow + audit |
| Transfer | `send_transaction`, `transfer_token` | Simulate + policy |
| Approval | `approve_token` | Block unlimited; limited approval con policy |
| Signature | `sign_message`, `sign_typed_data` | Decode + approval/policy |
| Contract write | `write_contract` | Simulate + ABI decode + policy |
| Key management | `import_private_key`, `unlock_keystore` | Block |
| Unknown write | cualquier write no clasificado | Block |

### 9.6 PoC obligatorio antes de demo

Checklist:

1. Instalar Wallet Agent localmente.
2. Levantar Compass Proxy con Wallet Agent como upstream.
3. Confirmar que Compass puede hacer `tools/list` al upstream.
4. Confirmar que Compass espeja tools hacia Claude Code.
5. Ejecutar `add_custom_chain` para Monad Testnet.
6. Ejecutar `switch_chain` a Monad Testnet.
7. Ejecutar `get_wallet_info` y verificar `chain_id=10143`.
8. Ejecutar `get_balance` con una cuenta con MON de faucet.
9. Ejecutar `estimate_gas` para una transferencia simple.
10. Ejecutar `simulate_transaction` o `dry_run_transaction` para una transferencia simple.
11. Ejecutar `transfer_token` o `send_transaction` de monto mínimo en testnet.
12. Ejecutar `approve_token` con `uint256.max` y verificar que Compass bloquea sin forwardear.
13. Ejecutar `approve_token` limitado y verificar require approval/allow según policy.
14. Confirmar audit log para allow/block/forward.

Criterio de éxito:

```text
Claude Code puede usar tools de Wallet Agent sin ver Wallet Agent directamente.
Compass puede bloquear una approval peligrosa y forwardear una transacción segura en Monad Testnet.
```

### 9.7 Riesgos técnicos

- Wallet Agent es beta/no auditado.
- Algunas tools pueden construir/firme/enviar internamente sin exponer todo el payload que Compass necesita.
- Monad tiene diferencias de gas/RPC respecto de Ethereum; Compass debe validar `estimate_gas`, gas limit y simulación en Monad específicamente.
- Si Claude tiene acceso directo al Wallet Agent MCP, existe bypass.
- Si la tool upstream firma mensajes opacos, Compass no puede garantizar intención.

Mitigación:

- Wallet Agent solo detrás de Compass.
- Bloqueo por defecto para tools de key management.
- Bloqueo por defecto para unknown writes.
- Policy allowlist de chain id `10143` para hackathon.
- Requerir dry-run/simulation para toda tool write.
- Audit local inmutable para demo.

## 10. Integración con Dynamic

### 10.1 Lo validado por documentación oficial

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

### 10.2 Riesgo/ambigüedad

El flujo ClientGrant aparece en documentación pública, pero el wording menciona “first-party client” y ejemplos como Dynamic CLI, MCP server o IDE plugin. Hay que validar con PoC si Compass, como app tercera, puede usarlo directamente para login de usuarios finales o si está pensado para clientes first-party dentro del ecosistema Dynamic.

Esto define el diseño final de `compass login`.

### 10.3 Camino recomendado

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

## 11. Flujos de autenticación

### 11.1 Web login

```text
User -> Compass Web -> Dynamic Auth -> Dynamic JWT -> Compass Backend verifies JWT -> Session created
```

Requisitos:

- JWT enviado como Bearer token.
- Backend verifica firma, issuer, expiración y claims relevantes.
- No confiar en claims decodificados del cliente sin verificación.
- Refresh/re-auth cuando expire.

### 11.2 CLI login con Dynamic ClientGrant

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

### 11.3 MCP auth

Opción recomendada:

- El MCP server corre localmente.
- Usa el token del CLI o inicia su propio flujo de login.
- Cada tool call va autenticada contra Compass backend.
- Compass backend registra `source=mcp` y `agent_id`.

No permitir que el MCP server guarde tokens en texto plano.

## 12. Flujos de transacción

### 12.1 Manual approval flow — MVP seguro

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

### 12.2 Delegated execution flow — autonomía controlada

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

### 12.3 Blocked flow

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

## 13. Modelo de datos

### 13.1 User

```json
{
  "id": "user_123",
  "dynamic_user_id": "...",
  "email": "...",
  "created_at": "...",
  "status": "active"
}
```

### 13.2 Wallet

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

### 13.3 Session

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

### 13.4 Intent

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

### 13.5 TransactionProposal

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

### 13.6 Simulation

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

### 13.7 RiskAssessment

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

### 13.8 PolicyDecision

```json
{
  "id": "poldec_123",
  "risk_assessment_id": "risk_123",
  "decision": "allow|require_approval|require_step_up_auth|block",
  "matched_policies": ["policy_123"],
  "explanation": "Allowed because amount is under 25 USDC and recipient is allowlisted."
}
```

## 14. API mínima

### 14.1 Auth

```http
POST /auth/cli/start
POST /auth/cli/poll
POST /auth/logout
GET  /auth/session
```

### 14.2 Wallets

```http
GET /wallets
GET /wallets/{walletId}
GET /wallets/{walletId}/balances
```

### 14.3 Intents

```http
POST /intents
GET  /intents/{intentId}
POST /intents/{intentId}/normalize
```

### 14.4 Transactions

```http
POST /transactions/propose
POST /transactions/{proposalId}/simulate
POST /transactions/{proposalId}/review
POST /transactions/{proposalId}/approve
POST /transactions/{proposalId}/execute
GET  /transactions/{proposalId}
```

### 14.5 Policies

```http
GET    /policies
POST   /policies
GET    /policies/{policyId}
PATCH  /policies/{policyId}
DELETE /policies/{policyId}
POST   /policies/evaluate
```

### 14.6 Delegations

```http
GET    /delegations
POST   /delegations/request
POST   /delegations/webhook/dynamic
POST   /delegations/{delegationId}/revoke
GET    /delegations/{delegationId}/status
```

### 14.7 Audit

```http
GET /audit/events
GET /audit/events/{eventId}
GET /audit/intents/{intentId}
GET /audit/transactions/{proposalId}
```

## 15. Security model

### 15.1 Principios

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

### 15.2 Amenazas principales

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

## 16. UX del review de seguridad

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

## 17. MVP recomendado

El MVP para la Monad Hackathon debe demostrar el proxy, no una wallet propia.

### 17.1 P0 — Compass MCP Proxy + Wallet Agent + Monad Testnet

Entregables:

- CLI/comando local `compass-proxy`.
- Compass corre como MCP server visible para Claude Code.
- Compass arranca Wallet Agent como upstream MCP.
- Compass ejecuta `tools/list` contra Wallet Agent y espeja tools.
- Compass clasifica tools por riesgo.
- Compass configura Monad Testnet como custom chain con `add_custom_chain`.
- Compass permite read-only calls.
- Compass simula o dry-run antes de write calls.
- Compass bloquea unlimited approvals.
- Compass bloquea private-key/keystore tools.
- Compass aplica policy local JSON.
- Compass registra audit trail local.

Criterio de éxito:

```text
Claude usa Wallet Agent indirectamente a través de Compass.
Una transferencia chica en Monad Testnet se forwardea.
Una approval peligrosa se bloquea antes de llegar a Wallet Agent.
```

### 17.2 P1 — Approval UI y review humano

Entregables:

- Página local o web de approval.
- Review legible de tx: chain, token, amount, spender, calldata, balance deltas, gas.
- Decisiones `allow`, `require_approval`, `block`.
- Expiración de approvals.
- Hash/pinning del payload aprobado.

### 17.3 P2 — x402 / agentic payments on Monad

Entregables:

- Endpoint pago demo compatible con x402 o flujo equivalente.
- Claude intenta pagar por un recurso.
- Compass aplica spending limit por agente.
- Compass bloquea pagos fuera de budget o a destinatarios no allowlisted.

### 17.4 P3 — Wallet adapters adicionales

Entregables:

- Adapter para browser wallet signer.
- Adapter para Dynamic/embedded wallet.
- Adapter para Turnkey/Privy si conviene.
- Misma policy layer para todos los adapters.



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

## 19. Métricas de producto

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

## 20. Decisiones de diseño importantes

### 20.1 No empezar con autonomía total

Autonomía total suena más impresionante, pero es más difícil de defender. El MVP debe priorizar trust.

Primero: agente propone, Compass revisa, humano aprueba.

Después: políticas estrictas permiten ejecución automática.

### 20.2 No depender del LLM para seguridad crítica

El LLM puede explicar, resumir y ayudar a clasificar. Pero los bloqueos críticos deben ser determinísticos o basados en reglas verificables.

La IA puede decir “esto parece sospechoso”. La política debe decidir “esto se bloquea porque viola X”.

### 20.3 Backend como producto real

La UI puede cambiar. El CLI puede cambiar. MCP puede cambiar.

El asset defensible es:

- Risk engine.
- Policy engine.
- Audit trail.
- Integraciones de wallet/signing.
- Execution gateway seguro.

### 20.4 Compass debe ser chain-aware, no chain-limited

Solana primero está bien. Pero el diseño debe permitir EVM después.

Abstracciones necesarias:

- Chain.
- Asset.
- Wallet.
- Transaction proposal.
- Simulation provider.
- Risk checks por chain.
- Signing provider.

## 21. Open questions

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
- ¿El foco inicial es Solana retail, Monad agentic payments o agentic devtools multi-chain?
- ¿El pitch principal es safety para usuarios o infra para agentes?
- ¿Compass debe venderse como “MCP security proxy” horizontal o como “safe wallet for AI agents on Monad” vertical?

### Seguridad

- ¿Qué nivel de riesgo permite auto-execution?
- ¿Qué checks son hard-blockers?
- ¿Cómo se manejan errores de simulación?
- ¿Cómo se prueba que la transacción ejecutada coincide con la aprobada?
- ¿Qué información se guarda en audit sin exponer privacidad?
- ¿Qué tools upstream deben bloquearse siempre aunque el usuario las pida?
- ¿Cómo detectar si una tool aparentemente safe termina haciendo signing interno?
- ¿Cómo evitar bypass cuando el usuario instala Compass y Wallet Agent directo en el mismo MCP host?

## 22. PoC técnico inmediato

### 22.1 PoC Wallet Agent + Monad

Objetivo: validar que Wallet Agent funciona como upstream de Compass Proxy en Monad Testnet.

Pasos:

1. Instalar Wallet Agent localmente.
2. Arrancar Compass Proxy con Wallet Agent como upstream.
3. Ejecutar `tools/list` y guardar schemas.
4. Exponer tools espejadas a Claude Code.
5. Usar `add_custom_chain` para registrar Monad Testnet.
6. Usar `switch_chain` a Monad Testnet.
7. Verificar wallet info y chain id.
8. Consultar balance.
9. Estimar gas.
10. Simular o dry-run una transferencia.
11. Ejecutar una transferencia mínima.
12. Intentar unlimited approval.
13. Confirmar que Compass bloquea la approval sin forwardear.
14. Exportar audit.

Resultado esperado:

- Si funciona: Wallet Agent queda como upstream P0.
- Si falla en custom chain: fallback a `mcp-wallet-signer` + simulación propia con `viem`.
- Si falla simulación upstream: Compass implementa simulación mínima con RPC Monad/viem y usa Wallet Agent solo para signing/sending.

### 22.2 PoC ClientGrant

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

### 22.3 PoC MCP

Objetivo: validar que un agente pueda usar Compass sin tocar claves.

Tools mínimas:

- `get_wallet_state`
- `simulate_transaction`
- `score_risk`
- `render_review`

Resultado esperado:

- Claude/Codex puede pedir estado y review de transacción.
- No existe tool de firma directa.

### 22.4 PoC Delegated Access

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

## 23. Pricing posible

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

## 24. Qué tiene que demostrar Compass para ganar

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

## 25. Definición de “bueno” para el MVP

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

## 26. Fuentes usadas para Monad / Wallet Agent

- Wallet Agent GitHub: https://github.com/wallet-agent/wallet-agent
- Monad for Developers: https://docs.monad.xyz/introduction/monad-for-developers
- Monad JSON-RPC Overview: https://docs.monad.xyz/reference/json-rpc/overview
- Monad Changelog / ChainConfigs: https://docs.monad.xyz/developer-essentials/changelog
- Monad Network Information - Testnets: https://docs.monad.xyz/developer-essentials/testnets
- MCP Tools Specification: https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk

## 27. Fuentes oficiales de Dynamic usadas

- Dynamic ClientGrant — initiate a client grant request: https://www.dynamic.xyz/docs/api-reference/clientgrant/initiate-a-client-grant-request
- Dynamic ClientGrant — approve or deny a pending client grant: https://www.dynamic.xyz/docs/api-reference/clientgrant/approve-or-deny-a-pending-client-grant
- Dynamic ClientGrant — poll for the result of a client grant: https://www.dynamic.xyz/docs/api-reference/clientgrant/poll-for-the-result-of-a-client-grant
- Dynamic authentication tokens: https://www.dynamic.xyz/docs/overview/authentication/tokens
- Dynamic CLI overview: https://www.dynamic.xyz/docs/overview/cli/overview
- Dynamic Node SDK quickstart: https://www.dynamic.xyz/docs/node/quickstart
- Dynamic Delegated Access overview: https://www.dynamic.xyz/docs/overview/wallets/embedded-wallets/mpc/delegated-access/overview
- Dynamic Node SDK EVM Delegated Access: https://www.dynamic.xyz/docs/node/evm/delegated-access

## 28. Conclusión

Compass debe construirse como infraestructura de seguridad para agentic finance, pero para la Monad Hackathon el camino correcto no es construir una wallet completa.

La arquitectura correcta para el MVP es:

- Claude Code / Claude Desktop como MCP host.
- Compass MCP Security Proxy como única interfaz visible para el agente.
- Wallet Agent como upstream MCP detrás de Compass.
- Monad Testnet como chain inicial configurada vía `add_custom_chain`.
- Policy/risk/simulation/audit como core del producto.

Prioridad inmediata:

```text
Compass Proxy -> tools/list upstream -> mirror tools -> classify calls -> allow read-only -> simulate writes -> block dangerous approvals -> forward safe calls -> audit
```

El pitch fuerte:

```text
Existing wallet MCPs give AI agents transaction capability.
Compass wraps them with policy enforcement, simulation, approval and audit.
For Monad, this turns high-throughput agentic payments into something users can actually trust.
```

Lo que hay que validar antes de demo:

```text
Wallet Agent + add_custom_chain + Monad Testnet + simulate/dry-run + guarded transfer + blocked approval
```

Si eso funciona, Compass tiene un ángulo muy sólido: no compite contra wallet MCPs; los vuelve seguros.
