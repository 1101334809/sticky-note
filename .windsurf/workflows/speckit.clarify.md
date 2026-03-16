---
description: Clarify underspecified areas in the specification (recommended before /speckit.plan).
---

## User Input

```text
$ARGUMENTS
```

## Outline

1. **Identify current feature**:
   - Get current branch name
   - Find corresponding spec in `.specify/specs/<feature>/spec.md`

2. **Analyze specification**:
   - Find all [NEEDS CLARIFICATION] markers
   - Identify ambiguous requirements
   - Find missing edge cases
   - Check for conflicting requirements

3. **Generate clarification questions**:
   
   For each unclear area:
   - Formulate specific, answerable question
   - Provide context from the spec
   - Suggest possible answers if applicable

4. **Interactive clarification**:
   - Present questions one at a time
   - Record answers in spec
   - Update requirements based on answers

5. **Save**: Update `.specify/specs/<feature>/spec.md` with clarifications

## Question Format

```markdown
### Clarification Needed

**Area**: [Section of spec]
**Question**: [Specific question]
**Context**: [Why this matters]
**Options** (if applicable):
- A) [Option 1]
- B) [Option 2]
```

## Key Rules

- Ask specific, not vague questions
- Prioritize questions by impact
- Record all clarifications in the spec
- Maximum 5-10 questions per session
