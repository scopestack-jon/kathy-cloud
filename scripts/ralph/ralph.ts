#!/usr/bin/env npx tsx
import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";

const RALPH_DIR = path.dirname(new URL(import.meta.url).pathname);
const PARENT_TASK_FILE = path.join(RALPH_DIR, "parent-task-id.txt");
const PROGRESS_FILE = path.join(RALPH_DIR, "progress.txt");

function getParentTaskId(): string {
  if (!fs.existsSync(PARENT_TASK_FILE)) {
    console.error("❌ No parent-task-id.txt found. Run ralph setup first.");
    process.exit(1);
  }
  return fs.readFileSync(PARENT_TASK_FILE, "utf-8").trim();
}

function appendProgress(message: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(PROGRESS_FILE, `\n[${timestamp}] ${message}\n`);
}

function runAmp(prompt: string): string {
  const result = spawn("amp", ["--print", "-m", prompt], {
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf-8",
  });

  let output = "";
  result.stdout?.on("data", (data) => {
    output += data.toString();
    process.stdout.write(data);
  });
  result.stderr?.on("data", (data) => {
    process.stderr.write(data);
  });

  return new Promise((resolve, reject) => {
    result.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`amp exited with code ${code}`));
      }
    });
  }) as unknown as string;
}

async function main() {
  const maxIterations = parseInt(process.argv[2] || "10", 10);
  const parentTaskId = getParentTaskId();

  console.log(`🤖 Ralph starting with parent task: ${parentTaskId}`);
  console.log(`   Max iterations: ${maxIterations}`);
  appendProgress(`Ralph started. Parent: ${parentTaskId}, Max iterations: ${maxIterations}`);

  const progressContent = fs.existsSync(PROGRESS_FILE)
    ? fs.readFileSync(PROGRESS_FILE, "utf-8")
    : "";

  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📍 Iteration ${i}/${maxIterations}`);
    console.log(`${"=".repeat(60)}\n`);

    const prompt = `You are Ralph, an autonomous coding agent working through a task list.

## Your Mission
Pick up the next available task from parent task ${parentTaskId} and complete it.

## Progress So Far
${progressContent}

## Instructions
1. Run \`amp task list --parentID ${parentTaskId} --limit 5\` to see available tasks
2. Pick a task that is "open" and has no unfinished dependencies (or dependencies are "completed")
3. Mark it "in-progress": \`amp task update <id> --status in-progress\`
4. Implement the task following its description and acceptance criteria
5. Verify your work (typecheck, tests, browser verification as specified)
6. Mark it "completed": \`amp task update <id> --status completed\`
7. Update progress.txt with what you learned

## Completion
- If ALL subtasks are completed, mark the parent task completed and output: <promise>COMPLETE</promise>
- If you complete a task, summarize what you did
- If you get stuck, document the blocker in progress.txt and move on

## Important
- Each iteration is a fresh context - read progress.txt to understand prior work
- Keep tasks small - if something is too big, note it and move on
- Always run typecheck before marking complete`;

    try {
      const output = await runAmp(prompt);
      appendProgress(`Iteration ${i} completed`);

      if (output.includes("<promise>COMPLETE</promise>")) {
        console.log("\n🎉 All tasks completed! Ralph is done.");
        appendProgress("ALL TASKS COMPLETED");
        break;
      }
    } catch (error) {
      console.error(`\n❌ Iteration ${i} failed:`, error);
      appendProgress(`Iteration ${i} FAILED: ${error}`);
    }
  }

  console.log("\n📊 Ralph session ended. Check progress.txt for details.");
}

main().catch(console.error);
