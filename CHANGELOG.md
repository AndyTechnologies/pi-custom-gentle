# Changelog

All notable changes to `pi-custom-gentle` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-01

### Added
- Initial project structure with GitHub distribution
- Package.json root with `pi.extensions` config
- Extension main file: `extensions/pi-custom-gentle.ts`
- Patch Engine core: parser Markdown `replace`/`add` directives
- Patch validation: overlap detection, range validation
- State Manager: custom-odd mode with on/off/inherit/always commands
- Orchestrator adapter: `before_agent_start` hook integration
- Gentle Agents adapter: child process fingerprint-based identification
- Prompt Inspector: `/prompt inspect/export/diff/sources` commands
- Initial patches: `orchestrator.md` and `agents/explorer.md`
- ODD planning document with 12 specs and 10 tasks

### Changed
- (None yet)

### Fixed
- (None yet)