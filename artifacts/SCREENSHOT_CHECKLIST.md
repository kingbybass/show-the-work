# Screenshot Checklist

Use this list to capture a clean product narrative for TPM review.

## Folder and Naming

- Store all screenshots in `artifacts/screenshots/`
- Naming format: `01-home.png`, `02-parent-create-task.png`, etc.
- Keep resolution consistent (recommended: 1440x900 or 1920x1080)

## Required Screens (Priority)

1. `01-home.png`
- Landing or entry page with clear product identity

2. `02-parent-dashboard.png`
- Parent console overview with task management context

3. `03-task-creation-flow.png`
- Template selection + assignment + publish controls

4. `04-child-task-list.png`
- Child-side active task list / execution context

5. `05-submission-review.png`
- Parent approval queue (approve/reject actions visible)

6. `06-points-rewards.png`
- Points change and reward redemption flow

7. `07-leaderboard-or-rivals.png`
- Competitive/progress visualization

8. `08-security-stepup.png`
- Parent password/PIN verification for privileged transition

## Optional Screens (Strong Add-ons)

- `09-system-ops-view.png`: diagnostics/publish/status page if safe
- `10-mobile-view.png`: one mobile-width workflow screenshot
- `11-architecture-overlay.png`: architecture image with labels

## Capture Quality Rules

- Hide browser bookmarks/private tabs
- Use one language consistently across screenshots
- Keep timestamps reasonable and coherent
- Avoid clutter from dev tools unless intentionally shown

## Security Rules (Mandatory)

- Remove/blur emails, IDs, or personal data
- Do not show `.env` values, tokens, keys, or secret URLs
- Do not expose admin-only endpoints or internal domains
