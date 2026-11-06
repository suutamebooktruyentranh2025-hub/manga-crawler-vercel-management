# EnglishLabs Agent Workflow Rules

ALL agents operating in this repository MUST strictly follow the "Basic Workflow" sequence for any development task. 
Failure to follow these steps in order will result in a breakdown of the development lifecycle.

## Basic Workflow Sequence

**1. `brainstorming`**
- **When**: Activates before writing ANY code.
- **Action**: Refines rough ideas through questions, explores alternatives, presents design in sections for validation. 
- **Output**: MUST save the approved design document to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.

**2. `using-git-worktrees`**
- **When**: Activates after design approval.
- **Action**: Creates an isolated workspace on a new branch, runs project setup, and verifies a clean test baseline.

**3. `writing-plans`**
- **When**: Activates with an approved design.
- **Action**: Breaks work into bite-sized tasks (2-5 minutes each). Every task MUST have exact file paths, complete code, and verification steps.
- **Output**: MUST save the implementation plan to `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`.

**4. `subagent-driven-development` OR `executing-plans`**
- **When**: Activates with a finalized plan.
- **Action**: 
  - If `subagent-driven-development`: Dispatches a fresh subagent per task with a two-stage review (spec compliance, then code quality).
  - If `executing-plans`: Executes in batches with human checkpoints.

**5. `test-driven-development`**
- **When**: Activates during implementation.
- **Action**: Enforces RED-GREEN-REFACTOR. Write a failing test, watch it fail, write minimal code, watch it pass, then commit. Deletes any code written before tests.

**6. `requesting-code-review`**
- **When**: Activates between tasks.
- **Action**: Reviews the output against the plan, reports issues by severity. Critical issues block progress.

**7. `finishing-a-development-branch`**
- **When**: Activates when all tasks complete.
- **Action**: Verifies tests, presents options (merge/PR/keep/discard), and cleans up the worktree.

## Enforcements
- You CANNOT write code without a spec. 
- You CANNOT implement a spec without a plan. 
- You CANNOT execute a plan without tests. 
- Always explicitly invoke the respective `.agents/skills/<skill-name>/SKILL.md` when entering the corresponding phase.
