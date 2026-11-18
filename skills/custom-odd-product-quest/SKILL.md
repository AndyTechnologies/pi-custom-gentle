---
name: custom-odd-product-quest
description: "Trigger: custom-odd product quest, product decisions, domain gaps, feature scope, domain modeling for Custom ODD. Documents product/domain decisions in ODD tasks.md, detects gaps, and proposes resolution before task planning."
license: Apache-2.0
metadata:
  author: AndyTechnologies
  version: "1.0.0"
---

# Custom ODD Product Quest Skill

## Activation Contract

**Use this skill when:**
- Starting a new Custom ODD task with product/domain uncertainty
- User request involves feature scope, user flows, domain rules, or business logic decisions for Custom ODD
- Custom ODD Architecture Quest identifies gaps that are product/domain (not technical architecture)
- During Custom ODD development, new product questions arise that affect task planning
- Explicit request for product/domain decision documentation for Custom ODD

**Do NOT use this skill for:**
- Purely technical architecture decisions (use custom-odd-architecture-quest)
- Implementation-only tasks with settled requirements
- UI/UX design decisions without domain impact (use gentle-design)
- Decisions already documented in existing Custom ODD specs/ADRs

## Hard Rules

| Rule | Description |
|------|-------------|
| **Pre-planning gate** | Runs BEFORE task planning; gaps must be resolved or explicitly accepted as assumptions |
| **Documents in ODD tasks.md** | Decisions go under `## Product Contract` in the ODD task document |
| **Orchestrator owns questions via quests-interview** | Only orchestrator asks user, **using the internal `quests-interview` procedure** (bounded 50-question interview); Skill formulates questions |
| **Stable clause IDs** | Product clauses use `PC-01`, `PC-02`, etc. |
| **Gap detection is continuous** | Re-scan for gaps when requirements change or new info emerges |
| **No silent assumptions** | Every unresolved gap is either resolved, documented as assumption, or escalated |

## Knowledge Base

### Product Gap Categories (Custom ODD)

| Category | Description | Examples |
|----------|-------------|----------|
| **Scope ambiguity** | Unclear what is in/out of scope for Custom ODD task | "Does this include overlay custom-odd?" "Does this task affect agent interaction?" |
| **Domain rule gaps** | Missing business logic/rules for Custom ODD | "What happens when custom-odd is off mid-task?" "How does task classification persist?" |
| **User flow gaps** | Unspecified user journeys in Custom ODD context | "Error recovery flow when custom-odd deactivates?" "Empty states for prompt inspector?" |
| **Data ownership** | Unclear who owns/modifies data in Custom ODD | "Who can modify custom-odd state?" "Audit trail for patch applications?" |
| **Integration contracts** | External system expectations for Custom ODD | "How does Pi API interact with custom-odd?" "What are the contract boundaries?" |
| **Non-functional requirements** | Missing quality attributes for Custom ODD | "Performance impact of prompt transformation?" "Accessibility of TUI inspector?" "Reliability of diff algorithm?" |
| **Edge cases** | Unhandled boundary conditions for Custom ODD | "Concurrent custom-odd on/off?" "Patch application failure recovery?" |
| **Migration/upgrade** | Transition from existing state in Custom ODD | "Migrating from old prompt format?" "Backward compatibility with existing tasks?" |

### Decision Provenance Types (Custom ODD)

| Type | Description |
|------|-------------|
| `user_requirement` | Explicitly stated by user in Custom ODD context |
| `explicit_answer` | User answered a specific Custom ODD question |
| `existing_decision` | Documented in existing Custom ODD task or ADR |
| `convention` | Custom ODD project convention |
| `reversible_hypothesis` | Explicit assumption with rationale (must be validated) |
| `regulatory` | Compliance/legal requirement specific to Custom ODD |

## Decision Gates (Custom ODD)

| Situation | Action |
|-----------|--------|
| No product gaps detected | Document "No product gaps identified"; proceed to planning |
| Blocking gap (prevents safe planning) | Formulate concrete question; **invoke internal `quests-interview`** for bounded interview; STOP and wait for user |
| Assumable gap (reversible) | State explicit reversible hypothesis with rationale; document as `reversible_hypothesis` |
| Non-blocking gap (convention) | Apply existing convention; document as `convention` |
| Multiple independent blocking gaps | Resolve one at a time via separate `quests-interview` sessions or batch in minimal interactions |
| Requirements change mid-development | Re-run gap detection; update affected clauses; re-plan affected tasks |
| Gap depends on technical architecture | Coordinate with custom-odd-architecture-quest; document cross-reference |

## Execution Steps

### Phase 1: Initial Gap Detection (at task start)

1. **Read user request verbatim** — extract functional outcome, examples, error messages
2. **Inspect existing context** — ODD task document (if exists), Custom ODD ADRs, specs, domain docs, prior tasks
3. **Identify explicit requirements** — stated functional requirements, constraints, examples
4. **Scan for gaps** against gap categories:
   - For each functional area mentioned, check: scope, rules, flows, data, integration, NFRs, edges, migration
5. **Classify each gap**: `blocking` | `assumable` | `non-blocking` | `deferred`

### Phase 2: Gap Resolution

6. **For each `blocking` gap**:
   - Formulate concrete question with alternatives and consequences
   - **Invoke internal `quests-interview`** for bounded interview (max 50 questions, decision-tree discipline)
   - Record answer as `explicit_answer` with verbatim user response
   - Update clause state to `accepted`

7. **For each `assumable` gap**:
   - State explicit reversible hypothesis with rationale
   - Document validation criteria (how to verify later)
   - Mark clause as `assumed` with validation plan

8. **For each `non-blocking` gap**:
   - Apply existing convention or sensible default
   - Document as `convention` with reference

### Phase 3: Product Contract Creation

9. **Create `## Product Contract` section in ODD task document**:
   ```markdown
   ## Product Contract

   ### PC-01: [Short descriptive title]
   - **Context**: [Functional area and gap description]
   - **Decision**: [Accepted rule/flow/scope/behavior]
   - **Invariants**: [Properties that must hold for this decision]
   - **Constraints**: [Boundaries, limits, dependencies]
   - **Acceptance Criteria**: [Observable conditions for compliance]
   - **Expected Evidence**: [Tests, demos, specs, user flows]
   - **Provenance**: [user_requirement | explicit_answer | existing_decision | convention | reversible_hypothesis]
   - **State**: accepted | assumed | deferred
   - **Validation**: [How to verify this decision is correct] (for assumed)
   - **Cross-refs**: [AC-XX from Architecture Quest if related]
   ```

### Phase 4: Continuous Gap Monitoring

10. **During development**, when new information emerges:
    - Re-scan affected functional areas
    - Update Product Contract (add/replace clauses)
    - If new `blocking` gap found → stop and resolve
    - Communicate changes to orchestrator for task re-planning

### Phase 5: Pre-Planning Handoff

11. **Before task planning**, ensure:
    - All `blocking` gaps resolved or explicitly deferred with user acknowledgment
    - All `assumed` clauses have validation plans
    - Product Contract is complete for current scope
    - Cross-references to Architectural Contract are noted

## Output Contract

Upon completion, the orchestrator has:

- [ ] Product gaps identified and classified
- [ ] Blocking gaps resolved via user questions (or explicitly deferred)
- [ ] Assumable gaps documented as explicit reversible hypotheses
- [ ] Non-blocking gaps resolved via convention
- [ ] Product Contract created/updated in ODD task document with stable `PC-XX` IDs
- [ ] Each clause has: decision, invariants, constraints, acceptance criteria, evidence, provenance, state
- [ ] Validation plans for assumed clauses
- [ ] Cross-references to Architectural Contract clauses
- [ ] Ready for task planning with no unresolved blocking product decisions

## Product Contract Format (Custom ODD)

```markdown
## Product Contract

### PC-01: Custom-odd overlay scope
- **Context**: User request mentions custom-odd functionality but doesn't specify overlay scope or agent impact
- **Decision**: Custom-odd overlay applies only to orchestrator agent; worker and explorer agents unaffected in current scope
- **Invariants**: Worker and explorer agents receive unchanged prompt; orchestrator prompt includes custom-odd directives
- **Constraints**: No overlay modifications to agent-to-agent communication; patches apply only at agent start
- **Acceptance Criteria**: Inspector shows original/resultante diff for orchestrator; worker prompts unchanged; explorer prompts unchanged
- **Expected Evidence**: Inspector TUI demonstration; prompt comparison tests; overlay on/off state tests
- **Provenance**: explicit_answer (user confirmed "overlay only for orchestrator for now")
- **State**: accepted
- **Validation**: N/A
- **Cross-refs**: AC-03 (agent boundary)

### PC-02: Prompt Inspector TUI (assumed)
- **Context**: Prompt inspector needs TUI interface but full implementation deferred
- **Decision**: Basic inspector functionality available; TUI viewer deferred to future task
- **Invariants**: Original prompt always inspectable; transform applied when custom-odd is on
- **Constraints**: No TUI viewer when custom-odd off; basic diff always available
- **Acceptance Criteria**: Inspector shows prompt info; diff generated even without TUI viewer
- **Expected Evidence**: Inspector command outputs; diff correctness tests
- **Provenance**: reversible_hypothesis (standard pattern; validate with user if TUI issues arise)
- **State**: assumed
- **Validation**: Monitor user feedback on inspector usability; TUI adoption metrics
- **Cross-refs**: AC-05 (TUI boundaries)
```

## Coordination with Custom ODD Architecture Quest

| Scenario | Coordination |
|----------|--------------|
| Product gap has technical architecture impact | custom-odd-architecture-quest creates `AC-XX`; custom-odd-product-quest creates `PC-YY` with `Cross-refs` |
| Technical decision constrains product options | Architecture Quest runs first; Product Quest references accepted `AC-XX` |
| Product decision drives technical architecture | Product Quest runs first; Architecture Quest references accepted `PC-YY` |
| Both run concurrently | Orchestrator sequences: Product Quest for blocking product gaps first, then Architecture Quest |

## References

- custom-odd-architecture-quest: `custom-odd-architecture-quest` skill
- quests-interview: `quests-interview` skill (internal bounded interview procedure, 50-question budget, decision tree)
- custom-odd workflow: `gentle-ai` skill (Task Size, Track, Delegation Rules, Verification rule)
- Orchestrator-verification.md: Verification rule, tier table, assess/escalate
- rdd-defect-workflow/SKILL.md: RDD integration, candidate freeze, review authority
- gentle-ai/SKILL.md: Harness discipline, Work Routing, Review Lens Selection
- keep a changelog: https://keepachangelog.com/
- Semantic Versioning: https://semver.org/