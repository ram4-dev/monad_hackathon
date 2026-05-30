# Simulation Coverage Specification

## Purpose

Cover the simulation tools (`estimate_gas`, `simulate_transaction`) used as non-mutating evidence for write/approval/signature decisions. `dry_run_transaction` is absent upstream (`W0-BLOCKER-009`).

## Requirements

### Requirement: Simulation Tools Allowed And Audited

`estimate_gas` and `simulate_transaction` MUST be allowed and audited as `simulation` when given a valid tx candidate on chain `10143`.

#### Scenario: Simulation call forwards and is audited

- GIVEN an `estimate_gas` or `simulate_transaction` call with a tx candidate on `10143`
- WHEN W5 evaluates it
- THEN it is forwarded once and audited as simulation

### Requirement: dry_run_transaction Treated As Absent

`dry_run_transaction` MUST NOT be registered or exposed, because the live upstream does not provide it (`W0-BLOCKER-009`).

#### Scenario: dry_run_transaction not available

- GIVEN a call to `dry_run_transaction`
- WHEN W5 processes it
- THEN it is not exposed and is blocked as unmapped

### Requirement: Simulation Feeds Write Decisions

Simulation results MUST be available as evidence for write/signature/approval classes before their policy decision.

#### Scenario: Write requires simulation evidence

- GIVEN a write/approval/signature call requiring simulation
- WHEN simulation is unavailable or failed
- THEN the call blocks (fail-closed) before forwarding
