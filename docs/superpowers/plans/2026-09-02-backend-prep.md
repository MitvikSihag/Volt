# Backend Prep (Phase 3 Merge + W6 Structure) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Phase 3 (persistence/deploy) on main, then execute the four W6 structure refactors so the rating/load/benchmark/social domains have clean seams to build on.

**Architecture:** Two PRs. PR-A commits and merges the existing (verified-green) Phase 3 working-tree changes plus the product docs. PR-B is the W6 refactor branch off updated main: extract `load/TrainingMath`, split the PR engine out of `WorkoutService`, one `UserLookup`, move Dashboard into `analytics/`. Behavior must not change: the existing 22 integration tests and the checked-in OpenAPI contract are the safety net for every task.

**Tech Stack:** Java 21, Spring Boot 3.5, Gradle (run from `backend/`), JUnit, gh CLI.

**Spec:** [backend/ROADMAP.md](../../../backend/ROADMAP.md) §W6 + Phase 3 section; structure findings from the Sep-2026 SOLID audit (summarized in W6).

## Global Constraints

- Run all Gradle commands from `backend/` (`./gradlew build`). If Maven Central resolution fails (corporate SSL), retry with `--offline`.
- `docs/api/openapi.yaml` is the checked-in contract; verification compares, never overwrites. No task may change any HTTP path, operation, or schema.
- Package root `com.volt`; package-by-feature with per-package `dto/`; constructor injection only; DTOs only in responses; timestamps via injected `Clock`.
- No new interfaces for single implementations. No mapper frameworks.
- The web app's modified files (`web/app/*`, `web/components/*`, `web/package*.json`) are PAUSED WIP: never stage them in any commit in this plan.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Verify green, commit Phase 3, commit docs

**Files:** no source changes; staging + commits only.

**Interfaces:** Produces: a `codex/phase-3-stabilization` branch whose commits contain (a) all backend Phase 3 changes + `.github/`, (b) all product/design docs — and NOT the web WIP.

- [ ] **Step 1: Full build + tests**
Run: `cd backend && ./gradlew build`
Expected: BUILD SUCCESSFUL, 22 tests (Flyway/Testcontainers test may skip if Docker down — note it).
- [ ] **Step 2: Stage + commit Phase 3 (backend + CI only)**
```bash
cd /Users/a41223/Documents/Repos/Volt
git add backend/ .github/
git commit -m "feat(backend): phase 3 — PostgreSQL/Flyway persistence, Docker deploy, auth family-revocation fix, OpenAPI verification, CI workflow

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
- [ ] **Step 3: Stage + commit docs/design (explicit paths; never `git add .`)**
```bash
git add AGENTS.md PRODUCT.md RATINGS.md TEARDOWN.md DESIGNER_BRIEF.md VOLT_DESIGN_SYSTEM.md \
        design-screens/ volt-landing.html mobile/CLAUDE.md web/CLAUDE.md docs/
git commit -m "docs: product direction, teardown, ratings spec, design assets, per-module guides

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
- [ ] **Step 4: Confirm only web WIP remains dirty**
Run: `git status --short` — expected: only `web/app/*`, `web/components/*` (code), `web/package*.json` lines remain.

### Task 2: PR-A — push, CI, merge, tag

- [ ] **Step 1:** `git push -u origin codex/phase-3-stabilization`
- [ ] **Step 2:**
```bash
gh pr create --title "Phase 3: persistence & deploy foundation" --body "PostgreSQL + Flyway (validate), Docker Compose, env-externalized secrets, refresh-token family-revocation regression fix, OpenAPI contract verification without overwrite, CI workflow. Also carries the product-direction docs (PRODUCT/TEARDOWN/RATINGS) and design assets.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
- [ ] **Step 3:** `gh pr checks --watch` — expected: all green. If CI fails, fix forward on the branch (smallest change), push, re-watch.
- [ ] **Step 4:** `gh pr merge --merge` (repo convention is merge commits) → then `git fetch origin && git switch main && git pull`
- [ ] **Step 5:** `git tag phase3-persistence && git push origin phase3-persistence`
- [ ] **Step 6 (best-effort):** required check via `gh api repos/{owner}/{repo}/branches/main/protection` PUT — if 403/404 (plan/permissions), note for the user and continue.

### Task 3: Branch + `load/TrainingMath` (kill the duplicated math)

**Files:**
- Create: `backend/src/main/java/com/volt/load/TrainingMath.java`
- Create: `backend/src/test/java/com/volt/TrainingMathTest.java`
- Modify: `workout/WorkoutService.java` (progression: lines ~278–293; PR engine lines ~356–370 — pre-split, still here), `workout/DashboardService.java` (two volume lambdas), `workout/dto/WorkoutResponse.java` (totalVolumeKg), `workout/WorkoutRepository.java` (comment only on the JPQL)

**Interfaces:** Produces `com.volt.load.TrainingMath` with exactly:
```java
public final class TrainingMath {
    private TrainingMath() {}
    /** Epley estimated 1RM. Valid for 1..10 reps per RATINGS.md; callers filter. */
    public static double epleyOneRepMax(double weightKg, int reps) {
        return weightKg * (1 + reps / 30.0);
    }
    /** Null-safe set volume; 0 when reps or weight missing. */
    public static double setVolumeKg(Integer reps, Double weightKg) {
        return (reps == null || weightKg == null) ? 0.0 : reps * weightKg;
    }
}
```
- [ ] **Step 1:** `git switch -c feat/w6-structure-prep`
- [ ] **Step 2: Failing test** — `TrainingMathTest.java`:
```java
package com.volt;

import com.volt.load.TrainingMath;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class TrainingMathTest {
    @Test void epleyMatchesSpec() { assertEquals(105.0, TrainingMath.epleyOneRepMax(90, 5), 1e-9); }
    @Test void epleySingleIsWeight() { assertEquals(100.0, TrainingMath.epleyOneRepMax(100, 1), 1e-9); }
    @Test void volumeNullSafe() {
        assertEquals(0.0, TrainingMath.setVolumeKg(null, 100.0));
        assertEquals(0.0, TrainingMath.setVolumeKg(5, null));
        assertEquals(500.0, TrainingMath.setVolumeKg(5, 100.0));
    }
}
```
Run: `./gradlew test --tests com.volt.TrainingMathTest` → FAIL (class not found).
- [ ] **Step 3:** Create `TrainingMath.java` as above. Re-run → PASS.
- [ ] **Step 4: Replace every inline copy** (keep surrounding filters unchanged):
  - `WorkoutService` progression e1RM: `.mapToDouble(s -> TrainingMath.epleyOneRepMax(s.getWeightKg(), s.getReps()))`
  - `WorkoutService` progression volume: `.mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))`
  - `WorkoutService` PR ONE_REP_MAX comparator + PrComputation value: both via `TrainingMath.epleyOneRepMax(...)`
  - `WorkoutService` MAX_VOLUME sum: `TrainingMath.setVolumeKg(...)`
  - `DashboardService` weekVolume + volumeByDay lambdas: `TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg())` (drop the now-redundant null filters or keep — keep filters, they also exclude zero-noise)
  - `WorkoutResponse.from`: `.mapToDouble(s -> TrainingMath.setVolumeKg(s.getReps(), s.getWeightKg()))`
  - `WorkoutRepository.sumVolumeByUser`: add comment `// JPQL mirror of TrainingMath.setVolumeKg — keep in sync (DB-side aggregate)`
- [ ] **Step 5:** `./gradlew build` → all tests green. Commit: `refactor(load): single source of truth for Epley 1RM and set volume`

### Task 4: Split `PersonalRecordService` out of `WorkoutService`

**Files:**
- Create: `workout/PersonalRecordService.java`
- Modify: `workout/WorkoutService.java`, `user/UserController.java`, `workout/WorkoutController.java` (only if it exposes PR endpoints — check imports/usages first with `grep -rn "getPersonalRecords\|getRecordsGrid\|getProgression" backend/src/main/java`)

**Interfaces:** Produces `com.volt.workout.PersonalRecordService` (public, `@Service @Transactional`) with exactly:
```java
public void recomputePersonalRecords(User user, Exercise exercise)
public void clearPrReferences(WorkoutSet set)
@Transactional(readOnly = true) public List<PersonalRecordResponse> getPersonalRecords(String username, UUID exerciseId)
@Transactional(readOnly = true) public List<ExerciseRecordsResponse> getRecordsGrid(String username)
@Transactional(readOnly = true) public List<ProgressionPointResponse> getProgression(String username, UUID exerciseId)
```
- [ ] **Step 1:** Move from `WorkoutService` VERBATIM (cut, don't rewrite): `recomputePersonalRecords`, `syncPr`, `clearPrReferences`, `PrComputation`, `getPersonalRecords`, `getRecordsGrid`, `getProgression`, plus private copies of `getUser`/`findAccessibleExerciseEntity` (temporary — Task 5 dedupes lookups). Constructor deps: `WorkoutSetRepository, PersonalRecordRepository, ExerciseRepository, UserRepository`.
- [ ] **Step 2:** `WorkoutService` gains constructor dep `PersonalRecordService prService`; every former internal call becomes `prService.recomputePersonalRecords(...)` / `prService.clearPrReferences(set)`. Delete moved code + now-unused imports (`EnumMap`, `Optional`, `Set`...).
- [ ] **Step 3:** Re-wire callers found by the grep (expected: `UserController` → `getRecordsGrid`; exercise-scoped PR/progression endpoints in `ExerciseController` or `WorkoutController`): inject `PersonalRecordService` there instead of using `WorkoutService` for those calls. Controllers keep identical routes/DTOs.
- [ ] **Step 4:** `./gradlew build` → green (WorkoutControllerIntegrationTest + UserAndDashboardIntegrationTest cover PR flags/records). Commit: `refactor(workout): extract PersonalRecordService from WorkoutService`

### Task 5: `UserLookup` (one lookup, six deletions)

**Files:**
- Create: `user/UserLookup.java`
- Modify: `workout/WorkoutService.java`, `workout/ExerciseService.java`, `workout/RoutineService.java`, `workout/PersonalRecordService.java`, `activity/ActivityService.java`, `workout/DashboardService.java`, `user/UserService.java`

**Interfaces:** Produces:
```java
package com.volt.user;
// @Component, constructor-injected UserRepository
public User require(String username) // throws ResourceNotFoundException("User not found")
```
- [ ] **Step 1:** Create `UserLookup`. In each listed service: inject `UserLookup`, replace the private `getUser`/`findActiveUser`/inline lookup with `userLookup.require(username)`, delete the private helper and `UserRepository` dep where nothing else uses it (check per file — `UserService` still needs `UserRepository` for saves; `AuthService` untouched, it has auth-specific semantics).
- [ ] **Step 2:** `./gradlew build` → green. Commit: `refactor(user): single UserLookup.require for user resolution`

### Task 6: `analytics/` package + stats via services

**Files:**
- Create: `analytics/AnalyticsController.java` (content = old DashboardController, route unchanged `/api/dashboard`, class may keep name `DashboardController` — keep name, just move), `analytics/DashboardService.java`, `analytics/dto/DashboardResponse.java`
- Delete: the three originals under `workout/`
- Modify: `user/UserService.java`, `workout/WorkoutService.java`, `activity/ActivityService.java`, imports in moved files; `workout/dto/PersonalRecordResponse.java` stays (analytics imports it — it's public API of workout)

**Interfaces:** Produces on existing services:
```java
// WorkoutService
@Transactional(readOnly = true) public long countForUser(User user)          // delegates workoutRepository.countByUser
@Transactional(readOnly = true) public double totalVolumeKgForUser(User user) // delegates workoutRepository.sumVolumeByUser
// ActivityService
@Transactional(readOnly = true) public long countForUser(User user)
@Transactional(readOnly = true) public double totalDistanceMetersForUser(User user)
```
- [ ] **Step 1:** `git mv` the three files into `analytics/` (+`dto/`), fix `package`/imports (repos/entities they use are public). `DashboardService` switches its inline user lookup to `UserLookup`.
- [ ] **Step 2:** Add the four delegate methods above; `UserService.getStats` injects `WorkoutService` + `ActivityService` instead of their repositories; remove those repo imports from `user/`.
- [ ] **Step 3:** `./gradlew build` → green; **then** confirm contract untouched: the OpenAPI verification test passes unchanged.
- [ ] **Step 4:** Commit: `refactor(analytics): move dashboard read-model out of workout/; user stats via services`

### Task 7: PR-B — docs, push, CI, merge

- [ ] **Step 1:** Update `backend/CLAUDE.md` Project Structure block (add `load/`, `analytics/`, note PersonalRecordService) and tick W6 items in `backend/ROADMAP.md`. Commit: `docs(backend): record W6 structure changes`
- [ ] **Step 2:** `git push -u origin feat/w6-structure-prep` → `gh pr create --title "W6: structure prep for rating/load/benchmark domains" --body "..."` (list the four refactors; note zero API changes — contract verified) → `gh pr checks --watch` → `gh pr merge --merge` → pull main.
- [ ] **Step 3:** Final: `git switch main && git pull && cd backend && ./gradlew build` → green on main. Report: structure ready for `rating/ load/ event/ benchmark/ social/`.
