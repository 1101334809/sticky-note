---
description: Create or update project governing principles and development guidelines.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

Create or update the project's governing principles in `.specify/memory/constitution.md`.

The constitution defines:
- **Code Quality Standards**: Testing requirements, code review practices, documentation standards
- **Architecture Principles**: Design patterns, separation of concerns, scalability guidelines
- **User Experience**: Consistency, accessibility, performance requirements
- **Security & Privacy**: Data handling, authentication, authorization patterns
- **Development Workflow**: Git practices, CI/CD requirements, deployment standards

### Steps

1. **Check existing constitution**: Read `.specify/memory/constitution.md` if it exists
2. **Analyze user input**: Extract principles and guidelines from the user's description
3. **Generate/Update constitution**: Create comprehensive principles that will guide all development
4. **Save**: Write to `.specify/memory/constitution.md`

### Output Format

The constitution should include:
- Clear, actionable principles
- Rationale for each principle
- Examples of compliance and violation
- Priority/severity levels for each guideline
