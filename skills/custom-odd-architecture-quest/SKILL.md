---
name: custom-odd-architecture-quest
description: "Trigger: custom-odd architecture quest, architectural exploration, design decision, contract architecturale for Custom ODD. Explores architectural needs, identifies gaps, formulates user questions, and records a verifiable architectural contract for ODD tasks."
license: Apache-2.0
metadata:
  author: AndyTechnologies
  version: "1.0.0"
---

# Custom ODD Architecture Quest Skill

## Activation Contract

**Use this skill when:**
- A Custom ODD task may have material architectural consequences (new feature crossing module boundaries, substantial data model changes, new external integrations, changes to public contracts or domain models, authentication/authorization/secrets, concurrency/async/distributed processing, new extensibility needs, significant responsibility shifts, structural refactoring, hard-to-reverse decisions, explicit architectural design/review request within Custom ODD context)
- An architectural decision is pending that cannot be deduced from existing Custom ODD conventions or requirements

**Do NOT use this skill for:**
- Local modifications, trivial fixes, documentation-only changes without structural impact within Custom ODD
- Tasks where the architecture is already settled by existing Custom ODD conventions
- One-off exploratory questions that don't require a formal contract

## Knowledge Base

### Design Degradation Symptoms (Custom ODD)

| Symptom | Meaning | Possible Causes | Countermeasures |
|---------|---------|-----------------|-----------------|
| **Rigidity** | Small changes require multi-component edits within Custom ODD | Unnecessary coupling between Custom ODD components | Dependency inversion, interfaces between orchestrator/worker/explorer |
| **Fragility** | Changes break unrelated Custom ODD components | Hidden dependencies in Custom ODD pipeline | Explicit contracts, isolation of Custom ODD concerns |
| **Immobility** | Components hard to extract/reuse in Custom ODD context | Global state, infra coupling specific to Custom ODD | Encapsulation, dependency injection within Custom ODD |
| **Viscosity** | Quick patch easier than correct Custom ODD design | Complexity, friction within Custom ODD workflow | Simplify, reduce Custom ODD ceremony |
| **Unnecessary Complexity** | Abstractions without proven need in Custom ODD | Premature generalization beyond requirements | YAGNI, KISS for Custom ODD |
| **Unnecessary Repetition** | Shared knowledge duplicated across Custom ODD tasks | Missing abstraction for common Custom ODD patterns | DRY for truly shared Custom ODD knowledge only |
| **Opacity** | Responsibilities/invariants unclear in Custom ODD | Implicit Custom ODD contracts | Explicit contracts, documentation within ODD task |

### Design Principles (apply when relevant within Custom ODD)

- Separation of concerns between Custom ODD agents (orchestrator/worker/explorer)
- High cohesion, low coupling within Custom ODD modules
- SOLID principles for Custom ODD code and interfaces
- Encapsulation, information hiding for Custom ODD state
- Dependency inversion for Custom ODD extensibility
- Composition over inheritance (when beneficial for Custom ODD)
- KISS, YAGNI for Custom ODD complexity reduction
- DRY for truly shared Custom ODD knowledge only
- Design for change and reversibility within Custom ODD
- Explicit contracts and invariants for Custom ODD boundaries
- Proportionate tests for Custom ODD risk
- Incremental migration, compatibility within Custom ODD
- Observability, resilience, recovery (when pertinent to Custom ODD)
- Security by design, trust boundaries within Custom ODD
- Maintainability, accessibility (Custom ODD requirements)

### System & Deployment Architectures (recognize and compare within Custom ODD)

- Simple app / traditional monolith (Custom ODD single agent)
- Modular monolith (Custom ODD with separated concerns)
- Layered / N-tier (Custom ODD pipeline layers)
- Client-server (Custom ODD agent communication)
- SOA / service-oriented (Custom ODD service boundaries)
- Microservices (Custom ODD only when justified)
- Event-driven (Custom ODD event patterns)
- Web, workers, queues (Custom ODD tool integration)
- Serverless (Custom ODD when applicable)
- Microkernel / plugin (Custom ODD extension points)
- Pipes and Filters (Custom ODD data processing)
- Distributed, batch processing (Custom ODD when required)

**Evaluate:** deployment boundaries, communication, consistency, scaling, fault isolation, operational cost, evolution difficulty. **Prefer modular monolith over microservices unless requirements justify the complexity.**

### Internal Architectures & Boundaries (recognize and compare within Custom ODD)

- Layered Architecture (Custom ODD pipeline)
- Clean Architecture (Custom ODD boundary/core/interface)
- Hexagonal / Ports and Adapters (Custom ODD ports/adapters)
- Onion Architecture (Custom ODD layers)
- Domain-Driven Design (Custom ODD bounded contexts)
- Bounded Context (Custom ODD agent boundaries)
- Vertical Slice Architecture (Custom ODD feature slices)
- Modular capability-oriented (Custom ODD capability modules)
- Plugin-oriented (Custom ODD extension points)
- Dependency Injection / Inversion (Custom ODD dependency management)

**Distinguish:** technical layers vs. capabilities vs. domain boundaries within Custom ODD. Clean/Hexagonal/Onion are not identical; adopting one doesn't imply all variants.

### Data Flow & Consistency (when relevant within Custom ODD)

- CQRS (Custom ODD when requirements justify)
- Event Sourcing (Custom ODD event patterns)
- Event-driven processing (Custom ODD event-driven)
- Materialized Views (Custom ODD view patterns)
- Outbox Pattern (Custom ODD outbox for API calls)
- Saga Pattern (Custom ODD saga for multi-step processes)
- Idempotency, at-least-once (Custom ODD retry patterns)
- Strong vs. eventual consistency (Custom ODD consistency model)

**Don't introduce CQRS/Event Sourcing without requirements justifying their costs.**

### Design Patterns (recognize when relevant within Custom ODD)

Creational: Factory Method, Abstract Factory, Builder (Custom ODD when extending)
Structural: Adapter, Facade, Decorator, Proxy (Custom ODD integration)
Behavioral: Strategy, State, Command, Template Method, Observer, Mediator, Chain of Responsibility (Custom ODD behavior)
Structural: Composite, Bridge, Iterator (Custom ODD when compositing)
Architectural: Repository, Unit of Work, Anti-Corruption Layer, Circuit Breaker, Retry with backoff, Bulkhead (Custom ODD patterns)

**Not every problem needs a pattern. Simplest solution that satisfies requirements is best.**

## Hard Rules (Custom ODD)

| Rule | Description |
|------|-------------|
| **No mandatory full quest** | Quest activates proportionally to uncertainty and consequence. No full investigation for local/trivial changes within Custom ODD. |
| **Orchestrator owns user questions via quests-interview** | Only the orchestrator may ask the user, using the internal `quests-interview` procedure (bounded 50-question interview). The `grill-me` skill is user-invoked only and MUST NOT be invoked automatically. Subagents (including Council) never ask directly. |
| **Contract in ODD document** | Architectural contract lives in the ODD task document (`odd/tasks/<feature>.md`) under `## Architectural Contract`. No global contract registry. |
| **Stable clause IDs** | Contract clauses use stable identifiers: `AC-01`, `AC-02`, etc. |
| **Verifiable criteria** | Every clause must have observable acceptance criteria and expected evidence. |
| **Provenance required** | Each clause records provenance: user requirement, explicit answer, existing decision, convention, or reversible hypothesis. |
| **No premature acceptance** | Don't mark a clause `accepted` if it depends on a pending user answer. |
| **No duplication of RDD lenses** | Quest does not recreate `review-risk` or other RDD lenses. Council verifies the Quest contract only. |
| **Language/framework agnostic** | Quest does not impose a specific architecture on all projects. |

## Decision Gates (Custom ODD)

| Situation | Action |
|-----------|--------|
| Task has no architectural impact | Skip Quest; proceed inline within Custom ODD |
| Uncertainty exists but consequence low | Classify as `assumable` or `non-blocking`; use reversible hypothesis |
| Uncertainty is blocking (changes design/data/security/contracts within Custom ODD) | Formulate concrete question; **invoke internal `quests-interview`** for bounded interview; stop and wait for user |
| Multiple independent blocking decisions | Resolve one at a time via separate `quests-interview` sessions or batch in minimal interactions |
| Decision can be deduced from requirements + conventions | Document as accepted with provenance `convention` or `existing decision` |
| Requirements change after contract accepted | Update affected clauses; mark replaced decisions; don't rewrite history |

## Execution Steps (Custom ODD)

1. **Understand goal and scope**
   - Read the user request verbatim.
   - Identify functional outcome and expected result.
   - Determine affected modules, contracts, dependencies, integration points within Custom ODD.

2. **Inspect existing code and decisions**
   - Read relevant source files, interfaces, configuration.
   - Check existing Custom ODD ADRs, ODD docs, architectural conventions in the project.
   - Note current patterns, layer boundaries, data ownership within Custom ODD.

3. **Identify explicit requirements and constraints**
   - Extract stated requirements from the request.
   - Identify non-functional constraints (performance, security, compliance, compatibility within Custom ODD).

4. **Classify architectural gaps**
   - For each uncertainty that could materially change the solution, classify:
     - **Blocking**: prevents safe choice between alternatives affecting design/data/security/contracts within Custom ODD
     - **Relevant but assumable**: resolvable via explicit, reasonable, reversible hypothesis
     - **Non-blocking**: resolvable via existing Custom ODD conventions

5. **Resolve gaps proportionally**
   - For `blocking` gaps: formulate concrete question(s) and **invoke internal `quests-interview`** for a bounded interview (max 50 questions). The orchestrator runs the interview via the `grilling` primitive internally. Explain decision, relevant alternatives, and main consequences.
   - For `assumable` gaps: state explicit reversible hypothesis with rationale.
   - For `non-blocking` gaps: apply existing conventions.

6. **Compare relevant alternatives**
   - Compare only alternatives that could satisfy requirements.
   - Consider: functional fit, simplicity, cohesion/coupling, evolvability, regression risk, testability, security/isolation, performance/scaling, deployment/maintenance cost, reversibility, compatibility with existing Custom ODD architecture.
   - No invented metrics or false-precision scores. Explain trade-offs; select least complex solution satisfying requirements.

7. **Produce Architectural Contract**
   - Create/Update `## Architectural Contract` in the ODD task document.
   - For each clause, include:
     - **ID**: `AC-XX`
     - **Context**: functional problem and change scope
     - **Accepted decision**: architecture, boundaries, patterns, strategies selected
     - **Invariants**: properties implementation must maintain
     - **Constraints**: allowed/prohibited dependencies, data ownership, contracts, boundaries
     - **Acceptance criteria**: observable conditions for compliance
     - **Expected evidence**: files, interfaces, tests, results, behavior needed for verification
     - **Provenance**: user requirement, explicit answer, existing decision, convention, reversible hypothesis
     - **State**: `proposed` | `accepted` | `rejected` | `replaced`

8. **Deliver to implementation**
   - Ensure orchestrator has: understood goal/scope, boundaries/components, resolved gaps, Q&A, accepted contract, verifiable criteria, pending assumptions/risks.
   - Contract clauses transmitted to worker and Verify when relevant.

## Architectural Contract Format (Custom ODD)

```markdown
## Architectural Contract

### AC-01: [Short descriptive title]
- **Context**: [Functional problem and scope of change]
- **Decision**: [Accepted architecture/boundaries/patterns]
- **Invariants**: [Properties that must hold]
- **Constraints**: [Allowed/prohibited dependencies, data ownership, contracts]
- **Acceptance Criteria**: [Observable conditions for compliance]
- **Expected Evidence**: [Files, interfaces, tests, results, behavior]
- **Provenance**: [user requirement | explicit answer | existing decision | convention | reversible hypothesis]
- **State**: accepted
```

## Output Contract (Custom ODD)

Upon completion, the orchestrator has:

- [ ] Goal and scope understood
- [ ] Boundaries and affected components identified
- [ ] Relevant gaps resolved or classified
- [ ] Questions asked and answered (if any)
- [ ] Architectural contract accepted with stable clause IDs
- [ ] Verifiable acceptance criteria per clause
- [ ] Assumptions and risks documented
- [ ] Contract integrated into ODD task document (when substantial)
- [ ] Clauses transmitted to worker and Verify when relevant

## References (Custom ODD)

- custom-odd-product-quest: `custom-odd-product-quest` skill
- quests-interview: `quests-interview` skill (internal bounded interview procedure, 50-question budget, decision tree)
- custom-odd workflow: `gentle-ai` skill (Task Size, Track, Delegation Rules, Verification rule)
- docs/conventions.md: Project conventions for skills, agents, overlays
- orchestrator.md: ODD workflow, Task Size, Delegation Rules, Verification rule
- orchestrator-verification.md: Verification rule, tier table, assess/escalate
- rdd-defect-workflow/SKILL.md: RDD integration, candidate freeze, review authority
- gentle-ai/SKILL.md: Harness discipline, Work Routing, Review Lens Selection
- External references listed in Knowledge Base (verified at load time)