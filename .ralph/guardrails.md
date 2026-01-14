# Ralph Guardrails (“Signs”)

Add short rules here when something goes wrong so Ralph doesn’t repeat it.

## Sign: Start every iteration by reloading state

- **Trigger**: Beginning work in a new chat/tab or after a break
- **Instruction**: Read `RALPH_TASK.md`, then `.ralph/progress.md`, then `.ralph/guardrails.md` before acting.

## Sign: Prefer narrow reads over huge file reads

- **Trigger**: Needing to locate code or behavior
- **Instruction**: Search first (by symbol/keyword), then read only the relevant file sections.

## Sign: Keep steps small and check off criteria

- **Trigger**: Any change that moves the task forward
- **Instruction**: Do one “checkbox-sized” chunk, validate (`npm run build`), then:
  - Check off the criterion in `RALPH_TASK.md`
  - Append a 3–6 line entry to `.ralph/progress.md` (what changed, what you verified, what’s next)

