# Asset Production Runbook

## Step 1: Capture Screenshots

- Follow `SCREENSHOT_CHECKLIST.md`
- Save files under `artifacts/screenshots/`

## Step 2: Record Demo

- Follow `VIDEO_STORYBOARD.md`
- Export final file as `artifacts/demo.mp4`

## Step 3: Create Cover Image

- Open `COVER_TEMPLATE.svg` in Figma or browser
- Replace candidate/role text if needed
- Export PNG as `artifacts/cover.png`

## Step 4: Final Safety Pass

- Verify no credentials or personal data in assets
- Verify all filenames are clean and descriptive

## Step 5: Commit and Push

```bash
git add artifacts/
git commit -m "Add portfolio artifacts and production runbook"
git push
```
