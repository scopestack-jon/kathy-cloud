# /ralph

Run a “Ralph iteration” using files as memory.

## Bootstrap (if missing)

If these files/folders do not exist, create them:
- `RALPH_TASK.md` (with `[ ]` success criteria)
- `.ralph/progress.md`
- `.ralph/guardrails.md`

## Iteration Steps (mandatory)

1. Read `RALPH_TASK.md` and select the **first unchecked** criterion.
2. Read `.ralph/guardrails.md` and follow relevant Signs.
3. Read `.ralph/progress.md` to avoid duplicating work.
4. Implement the smallest change that completes the chosen criterion.
5. Verify with the task’s `test_command` (or default to `npm run build`).
6. Mark the criterion as completed (`[x]`) in `RALPH_TASK.md`.
7. Append a short entry to `.ralph/progress.md` describing:
   - what changed and why
   - what you ran to verify
   - what’s next / blockers

## Completion

If all criteria are `[x]`, output exactly:

`<ralph>COMPLETE</ralph>`

