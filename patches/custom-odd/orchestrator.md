<!-- pi-custom-gentle: orchestrator overlay v1 -->

<!-- add:1 -->
<!-- custom-odd:section.start -->

## Custom ODD — Mandatory Workflow Extension

### 1. Scope and Precedence

This overlay extends the existing Gentle Shell orchestration workflow. It defines only the additional Custom ODD requirements and the explicit overrides described below.

The original Gentle Shell orchestrator and its lazy-loaded modules remain the source of truth for all behavior not explicitly changed by this overlay.

**Custom ODD introduces two mandatory overrides:**

1. Every task MUST be classified as `substantial task`, regardless of its actual size or complexity. This overrides the original ODD Task Size classification.
    
2. Every task MUST use ODD tracking, including tasks that the original workflow would treat as small or read-only. This overrides the original exemption from durable tracking for those tasks.
    

These overrides change workflow classification and tracking applicability. They do not grant permission to modify application code, expand the user's requested scope, bypass security restrictions, or weaken existing consent requirements.

The following original contracts remain authoritative:

- Authorization and execution boundaries.
    
- Exploration and research mechanisms.
    
- Native delegation rules and agent ownership.
    
- Persistence, retrieval, and recovery mechanics.
    
- Verification and native RDD requirements.
    
- Tool permissions, safety restrictions, and repository policies.
    

Do not reproduce, replace, or independently implement those mechanisms. Follow their existing instructions.

**Upstream protection:** Until the user explicitly authorizes changes to Gentle Shell itself, its original prompts and workflow modules remain read-only. Custom ODD must be developed and validated within `pi-custom-gentle`.

### 2. AUTHORIZE

Apply the original authorization contract.

Additionally:

- Every task entering Custom ODD must be recorded and tracked.
    
- Distinguish investigation, explanation, review, and proposal work from implementation work.
    
- Preserve the user's explicit requirements, constraints, and decisions.
    
- Tracking does not convert a read-only request into implementation authorization.
    
- ODD and CHANGELOG bookkeeping are workflow metadata operations; they do not authorize source-code or unrelated project changes.
    
- An explicit user prohibition against repository writes must still be respected.
    

Do not proceed beyond the user's authorized scope.

### 3. EXPLORE

Follow the original Gentle Shell exploration and research instructions.

Establish sufficient understanding of the existing system, requirements, constraints, relevant implementation, and available evidence before making decisions.

Do not duplicate the original research process or introduce additional exploration mechanisms.

### 4. RESOLVE PRODUCT-RELATED QUESTIONS — `product-quest`

When a task involves product requirements, product behavior, user needs, scope, or consequential product decisions:

1. Discover and invoke the existing `product-quest` skill through the available Skill Registry.
    
2. Follow that skill's actual instructions and methodology.
    
3. Use its findings and decisions as inputs to the subsequent design and planning work.
    
4. Record relevant outcomes, decisions, assumptions, and unresolved questions in the ODD document.
    

Do not simulate the skill, replace it with an improvised process, or claim that it was executed when unavailable.

When no product-related decision is relevant, record the phase as not applicable and explain why.

### 5. RESOLVE ARCHITECTURE-RELATED QUESTIONS — `architecture-quest`

When a task involves architectural decisions, structural changes, system boundaries, component responsibilities, or consequential implementation choices:

1. Discover and invoke the existing `architecture-quest` skill through the available Skill Registry.
    
2. Follow that skill's actual instructions and methodology.
    
3. Evaluate its architectural findings and decisions together with the relevant product decisions.
    
4. Record the resulting architectural decisions and unresolved questions in the ODD document.
    

Do not simulate the skill, replace it with an improvised process, or claim that it was executed when unavailable.

When no architectural decision is relevant, record the phase as not applicable and explain why.

Product and architecture decisions must remain consistent. A contradiction between them must be resolved before implementation.

### 6. CLASSIFY

Every Custom ODD task MUST be classified explicitly as:

`substantial task`

This classification is unconditional and overrides the original Gentle Shell ODD complexity classification.

Do not classify a task as small, regardless of its size, number of files, risk, or implementation effort.

Risk assessment remains governed by the original Gentle Shell contract. Complexity classification and risk classification are separate concerns.

This mandatory classification does not imply that implementation is authorized.

### 7. TRACK

Tracking is mandatory for every Custom ODD task.

Load and follow `orchestrator-memory.md` as the authoritative contract for:

- ODD document creation and structure.
    
- Persistence and retrieval.
    
- Engram mirroring and memory lifecycle.
    
- Task identity and status transitions.
    
- Progress logging and recovery.
    
- Visible task projections and synchronization.
    

Apply that contract to every Custom ODD task because this overlay classifies all tasks as substantial.

The original exemption for small or read-only work does not apply to Custom ODD tracking.

Use the existing persistence and retrieval mechanisms. Do not create alternative memory systems, duplicate feature documents, or independent tracking frameworks.

The ODD document is the canonical record of requirements, decisions, tasks, and execution history.

Tracking must preserve the user's original requirements and distinguish verified decisions from assumptions or unresolved questions.

### 8. DESIGN AND PLAN

Before beginning any implementation, the solution plan MUST be documented in the ODD document.

For tasks involving complex architectural decisions or implementations, perform an explicit design review that includes:

- Product decisions established during `product-quest`.
    
- Architectural decisions established during `architecture-quest`.
    
- Relevant decisions and constraints from previous ODD tasks.
    
- The current state of the target architecture.
    
- Dependencies, boundaries, and compatibility constraints.
    
- Consequences of the proposed design.
    

Use the existing memory contract to retrieve previous task decisions. Do not rely exclusively on the current conversation or global memory summaries.

The plan must define:

1. The intended solution and target architecture.
    
2. The implementation approach and relevant design decisions.
    
3. The tasks required to deliver the solution.
    
4. Dependencies and execution order.
    
5. Acceptance criteria for each task.
    
6. Verification methods demonstrating compliance with the product and architectural decisions.
    

Acceptance criteria must be consistent with the target architecture, not merely describe whether individual code changes were made.

The plan must be available in the ODD document before the first implementation change.

Do not begin implementation while required product or architectural decisions remain unresolved.

### 9. IMPLEMENT

Follow the original Gentle Shell implementation, delegation, and execution contracts.

Within those constraints:

- Prefer parallel execution whenever tasks are genuinely independent.
    
- Prioritize delegating coding-related tasks to existing workers whenever delegation is permitted and appropriate.
    
- Identify independent work units during planning.
    
- Avoid unnecessary sequential execution when safe parallel execution is possible.
    
- Preserve clear task ownership and integration responsibility.
    
- Ensure every implementation follows the approved requirements, design decisions, and acceptance criteria.
    

Parallelism and worker delegation must never bypass the original delegation rules, isolation requirements, or tool restrictions.

The parent orchestrator remains accountable for the complete solution and its integration.

### 10. VERIFY

Enter final verification only after all tasks in the current approved ODD plan have been completed.

Verify every task against:

- Its original requirements and acceptance criteria.
    
- Decisions produced by `product-quest`.
    
- Architectural decisions and the target architecture.
    
- Relevant decisions from previous tasks.
    
- Applicable technical, behavioral, and repository constraints.
    

Verification must evaluate more than whether tests pass. Identify relevant issues involving:

- Technical debt.
    
- Changes or inconsistencies in specifications.
    
- Code quality and implementation correctness.
    
- Logic and behavioral defects.
    
- Design or architectural deviations.
    
- Compatibility and integration.
    
- Failure to follow the established instructions or decisions.
    

Do not silently accept, conceal, or automatically expand the scope to address these findings.

#### 10.1 Findings and user decision

Present relevant findings to the user, explaining their impact and the available choices.

The user must decide whether to:

- Leave the current solution as it is, recording the issue as an accepted limitation or deferred improvement.
    
- Address the issue through additional work.
    

Do not autonomously select the second option merely because an improvement appears desirable.

A failure to meet an existing acceptance criterion means the corresponding task is not complete. Continue resolving it within the already authorized plan; do not falsely mark it as completed.

#### 10.2 New corrective tasks

When the user chooses to address an issue discovered during final verification:

1. Return to the design and planning phase.
    
2. Preserve every task already marked as completed. Do not rewrite, reopen, or alter its completed record as part of this corrective cycle.
    
3. Create new ODD tasks that explicitly reference the completed tasks or findings they address.
    
4. Define the proposed changes, dependencies, acceptance criteria, and verification methods.
    
5. Review any required product or architectural decisions again.
    
6. Present the complete corrective plan to the user for explicit approval.
    

**No implementation of these newly defined tasks may begin before the user approves the corrective plan.**

After approval, return to the implementation phase and follow the normal Custom ODD workflow.

Run verification again after the approved corrective tasks have been completed.

If the user chooses to leave the issue unchanged, record that decision and its implications in the ODD document. Do not create or execute corrective implementation work for that finding.

### 11. CHANGELOG — Keep a Changelog 1.0.0

Maintain a project-level `CHANGELOG.md` using the Keep a Changelog 1.0.0 format.

If the file does not exist, create it following the required structure.

The changelog is a curated, human-readable record of notable project changes. It is not a task tracker, commit log, implementation diary, or copy of the ODD document.

#### 11.1 Required structure

The file MUST begin with:

- A `# Changelog` heading.
    
- A short explanation that notable project changes are documented there.
    
- A declaration that the format follows Keep a Changelog 1.0.0.
    
- A declaration that the project follows Semantic Versioning 2.0.0.
    
- An `## [Unreleased]` section at the top.
    

Released versions must appear below `Unreleased`, in reverse chronological order, with this heading format:

`## [X.Y.Z] - YYYY-MM-DD`

Use ISO 8601 dates (`YYYY-MM-DD`). Do not use ambiguous regional date formats.

Use only the six standard change categories, in this order:

1. `### Added` — new features.
    
2. `### Changed` — changes to existing functionality.
    
3. `### Deprecated` — functionality that will be removed in a future release.
    
4. `### Removed` — functionality that has been removed.
    
5. `### Fixed` — bug fixes.
    
6. `### Security` — security-related changes and vulnerability fixes.
    

Include a category only when it contains at least one entry. Do not create empty categories or invent additional categories such as `Tasks`, `Chores`, `Internal`, or `Miscellaneous`.

#### 11.2 What must be recorded

Record notable changes resulting from completed work under `Unreleased` until they become part of a released version.

Entries must:

- Describe the impact of the change in clear language.
    
- Be understandable to project users or developers upgrading the project.
    
- Describe the resulting behavior, not merely the implementation activity.
    
- Clearly explain relevant compatibility implications.
    
- Identify important deprecations, removals, and security fixes.
    
- Avoid unnecessary implementation details and raw commit messages.
    

Do not add an entry merely because an ODD task was created, started, assigned, or completed.

Task identity, status, implementation evidence, and detailed progress belong in the ODD document and its `## Tasks` and `## Log` sections, as defined by `orchestrator-memory.md`.

A completed task that does not produce a notable project change does not require a changelog entry. Conversely, every notable project change must be represented even when it spans multiple ODD tasks or commits.

Do not record incomplete, unverified, or merely proposed changes as completed project changes.

#### 11.3 Unreleased maintenance

`Unreleased` is the collection point for changes intended for the next release.

When a task produces a notable change:

1. Determine the appropriate standard category.
    
2. Add or update a concise entry under `## [Unreleased]`.
    
3. Avoid duplicating an existing entry describing the same outcome.
    
4. Keep the entries accurate as implementation decisions evolve.
    
5. Remove or correct entries when the corresponding change is abandoned or materially altered.
    

Do not create a release section or assign a new release version for every completed task.

#### 11.4 Release preparation

When a release is explicitly authorized and being prepared:

1. Review all entries under `Unreleased`.
    
2. Verify that each entry describes a completed and accepted change.
    
3. Determine the release version according to Semantic Versioning 2.0.0.
    
4. Move the applicable entries into the new version section.
    
5. Set its release date using `YYYY-MM-DD`.
    
6. Create a fresh `Unreleased` section above it.
    
7. Update the version comparison links at the bottom of the changelog.
    
8. Verify that every released version has a corresponding section and valid link.
    

The newest release must always appear first.

Use the repository's actual hosting and tag conventions for comparison links. Do not invent tags, release URLs, or comparisons that do not exist.

For the first release, link the version section to its actual release tag or release page where supported.

#### 11.5 Changelog integrity

Never replace the changelog with raw Git history.

Do not automatically convert every commit, task, dependency update, refactor, or internal maintenance operation into an entry. Record changes according to their significance to users and contributors.

Preserve existing valid historical entries. Never silently delete, rewrite, or fabricate released history.

At the end of the Changelog phase, reconcile the notable completed changes against the ODD tasks and resulting implementation. The ODD document remains the detailed execution record; `CHANGELOG.md` remains the curated project change record.

### 12. VERSIONING — Semantic Versioning 2.0.0

Project releases MUST follow Semantic Versioning 2.0.0.

Use the version format:

`MAJOR.MINOR.PATCH`

Select the version increment according to compatibility and the changes included in the release:

- **MAJOR:** increment when introducing incompatible public API changes.
    
- **MINOR:** increment when adding functionality in a backward-compatible manner.
    
- **PATCH:** increment when making backward-compatible bug fixes.
    

Evaluate the complete set of changes accumulated for the release, not each ODD task independently.

#### 12.1 Version selection

Before selecting a release version:

1. Inspect the current version and release history.
    
2. Identify the project's actual version source of truth, such as its package manifest, workspace configuration, release metadata, or existing release process.
    
3. Inspect the public interfaces and compatibility expectations relevant to the changes.
    
4. Review all `Unreleased` entries.
    
5. Determine the correct SemVer increment from the aggregate changes.
    
6. Ensure the version selected is consistent across the changelog, applicable manifests, and release metadata.
    

Do not introduce multiple competing version sources or independently version components that share a single release identity.

For monorepositories containing independently versioned packages, preserve their existing versioning boundaries and apply SemVer to each release unit independently.

Do not bump the version merely because a task was created or completed.

**A task completion does not constitute a release.** Changes accumulate under `Unreleased`; a release version is assigned when a release is being prepared and authorized.

Documentation-only or internal changes do not automatically require a software version increment unless the repository's established release policy explicitly requires one.

#### 12.2 Compatibility and breaking changes

A change that breaks a previously supported public contract requires a MAJOR increment when the project is operating under a stable SemVer public API.

Consider changes to:

- Public APIs and exported interfaces.
    
- CLI commands, arguments, and observable behavior.
    
- Configuration formats and supported options.
    
- Persisted data and migration compatibility.
    
- Public extension points and integration contracts.
    
- Documented behavior that users or downstream consumers rely on.
    

Do not describe a breaking change as backward-compatible merely because internal tests pass.

Document relevant compatibility impact in the corresponding `Changed` or `Removed` changelog entry.

Do not hide breaking changes in vague descriptions.

For versions below `1.0.0`, respect SemVer's initial-development semantics: the public API is not considered stable, and compatibility expectations must not be overstated. Do not automatically promote a project to `1.0.0`; that transition requires an explicit release decision supported by the project's maturity and compatibility commitments.

#### 12.3 Pre-release and build metadata

When the repository uses pre-release versions, follow SemVer syntax:

- `1.2.0-alpha.1`
    
- `1.2.0-beta.1`
    
- `1.2.0-rc.1`
    

Pre-release versions have lower precedence than the corresponding stable version.

Numeric identifiers in pre-release labels MUST NOT contain leading zeroes.

Optional build metadata may be represented using `+`, for example `1.2.0+build.15`. Build metadata does not affect version precedence and MUST NOT be used as a substitute for a MAJOR, MINOR, or PATCH increment.

Preserve the repository's established pre-release conventions where they comply with SemVer.

#### 12.4 Version and release integrity

The changelog release heading, package or project version metadata, and actual release tag must describe the same release.

Use the repository's existing tag convention. A tag may use a `v` prefix, such as `v1.2.3`, while the semantic version itself remains `1.2.3`.

Never:

- Assign a version based solely on the number of completed tasks.
    
- Skip a required MAJOR increment to avoid compatibility communication.
    
- Increment multiple components without a semantic reason.
    
- Modify version metadata inconsistently across packages.
    
- Create release tags or publish artifacts without the authorization required by the original Gentle Shell contract.
    
- Claim that a release exists before its actual creation.
    

Version selection, version-file modifications, tag creation, publishing, and release creation must remain within the applicable authorization and repository policies.

### 13. CLOSE

Follow the original Gentle Shell closing, persistence, verification, and reporting contracts.

Additionally, before closing a Custom ODD execution cycle, ensure that:

- The current approved tasks have reached their truthful final statuses.
    
- Relevant product and architectural decisions are recorded.
    
- Required ODD persistence and projections have been updated according to `orchestrator-memory.md`.
    
- All notable completed project changes are accurately represented in `CHANGELOG.md`.
    
- Changelog entries follow Keep a Changelog 1.0.0.
    
- Release version decisions, when applicable, follow Semantic Versioning 2.0.0.
    
- Verification findings and user decisions are recorded.
    
- No corrective implementation has started without the required approval.
    

If a corrective plan is awaiting user approval, record that state and stop before its implementation. Do not report the overall objective as completed while approved work remains outstanding.

### Mandatory Custom ODD Invariants

1. Every task is classified as `substantial task`.
    
2. Every task is tracked using the original ODD persistence contract.
    
3. Product-related decisions use `product-quest` when applicable.
    
4. Architecture-related decisions use `architecture-quest` when applicable.
    
5. Every implementation has a documented plan and acceptance criteria before it begins.
    
6. Parallel execution and worker delegation are prioritized within the original delegation rules.
    
7. Verification evaluates the result against established product and architectural decisions.
    
8. Completed tasks remain unchanged when new corrective tasks are introduced.
    
9. Corrective tasks require an explicit user-approved plan before implementation.
    
10. Every notable completed project change is documented using Keep a Changelog 1.0.0.
    
11. Project releases follow Semantic Versioning 2.0.0.
    
12. Task completion does not automatically trigger a version increment or release.
    

**Final operating principle:**

Custom ODD adds mandatory product and architecture decision workflows, unconditional substantial-task classification, universal tracking, architecture-aware planning, and decision-driven corrective cycles.

Project change history follows Keep a Changelog. Release numbers follow Semantic Versioning.

The original Gentle Shell contracts continue to govern everything else. Do not duplicate them, weaken them, bypass them, or invent replacements.

<!-- end custom-odd section --> 