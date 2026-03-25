# Qandle Auto Clock In/Out

Automated daily clock-in and clock-out for [Qandle](https://creospan.qandle.com/) using Selenium WebDriver (Node.js). Runs entirely on **GitHub Actions** — no server required.

## Features

- **Auto Clock In** — at `CLOCK_IN_START_AT` IST + random 0–8 min delay
- **Auto Clock Out** — at `CLOCK_OUT_END_AT` IST − 10 min + random 0–8 min delay
- **Configurable timing** — change `CLOCK_IN_START_AT` and `CLOCK_OUT_END_AT` secrets to adjust
- **Random delay** — 0–8 minute random wait before each action (looks natural)
- **Weekends skipped** — no clock in/out on Saturday or Sunday
- **Holiday support** — add dates to skip via `HOLIDAYS` secret
- **Manual trigger** — clock in or out on demand from GitHub UI or phone
- **Headless** — runs in headless Chrome on GitHub Actions
- **Budget-friendly** — ~440 min/month (well within GitHub's 2,000 min free tier)

## Project Structure

```
├── qandle.js          # Shared module (login, clockIn, clockOut, helpers)
├── clock_in.js        # Clock-in script (with random 0–8 min delay)
├── clock_out.js       # Clock-out script (with random 0–8 min delay)
├── test_toggle.js     # Test script (toggles every 30s for 5 min)
├── .env               # Local credentials (git-ignored)
├── .github/
│   └── workflows/
│       └── qandle.yml # GitHub Actions workflow (two cron jobs)
└── package.json
```

## How It Works

Two separate GitHub Actions cron jobs run daily (Mon–Fri):

| Cron (UTC)      | IST Time | Script         | Random Delay | Actual Window       |
| --------------- | -------- | -------------- | ------------ | ------------------- |
| `30 2 * * 1-5`  | 8:00 AM  | `clock_in.js`  | 0–8 min      | 8:00 AM – 8:08 AM   |
| `10 18 * * 1-5` | 11:40 PM | `clock_out.js` | 0–8 min      | 11:40 PM – 11:48 PM |

Timing is controlled by `CLOCK_IN_START_AT` and `CLOCK_OUT_END_AT` GitHub secrets. The scripts wait until the target IST time if the cron fires early, then add a random 0–8 min delay.

Each job: **~10 min** (8 min max delay + ~2 min execution) × 2 jobs × 22 days = **~440 min/month**.

## Local Setup

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd Qandle

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env <<EOF
QANDLE_EMAIL=your.email@company.com
QANDLE_PASSWORD=your_password
HOLIDAYS=2026-01-26,2026-03-14,2026-08-15,2026-10-02
CLOCK_IN_START_AT=8:00
CLOCK_OUT_END_AT=23:50
EOF

# 4. Run
npm run clock-in        # Clock in (with random delay)
npm run clock-out       # Clock out (with random delay)
npm test                # Toggle clock in/out every 30s for 5 min
```

## GitHub Actions Deployment

### 1. Create a private GitHub repo

```bash
cd Qandle
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:YOUR_USERNAME/qandle-auto.git
git branch -M main
git push -u origin main
```

> **Important:** Make the repository **private** to protect your credentials.

### 2. Add GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name         | Value                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| `QANDLE_EMAIL`      | Your Qandle email (e.g. `kartik.tyagi@creospan.com`)                    |
| `QANDLE_PASSWORD`   | Your Qandle password                                                    |
| `HOLIDAYS`          | Comma-separated dates to skip (e.g. `2026-01-26,2026-08-15,2026-10-02`) |
| `CLOCK_IN_START_AT` | Clock-in time in IST (e.g. `8:00`)                                      |
| `CLOCK_OUT_END_AT`  | Clock-out deadline in IST (e.g. `23:50`)                                |

### 3. How it works

The workflow uses **two separate cron schedules**:

- **Clock In cron** (`30 2 * * 1-5`) fires at 8:00 AM IST → waits until `CLOCK_IN_START_AT` if early → random 0–8 min → clocks in
- **Clock Out cron** (`10 18 * * 1-5`) fires at 11:40 PM IST → waits until `CLOCK_OUT_END_AT − 10 min` if early → random 0–8 min → clocks out

Each run takes ~10 min max. The timeout is set to 15 min as a safety buffer.

### 4. Changing the schedule

To change clock-in/out times:

1. Update the **GitHub secrets** `CLOCK_IN_START_AT` and `CLOCK_OUT_END_AT` (IST, e.g. `8:00` and `23:50`).
2. Update the **cron expressions** in `.github/workflows/qandle.yml` to match (convert to UTC: `UTC = IST − 5:30`).
   - Clock In cron = `CLOCK_IN_START_AT` converted to UTC
   - Clock Out cron = `CLOCK_OUT_END_AT` minus 10 min, converted to UTC
3. Push the updated YAML to the default branch.

The scripts handle minor cron drift (up to 30 min early) by waiting until the target time from the secret.

Example: Clock in at 10:00 AM IST, clock out by 11:00 PM IST:

```yaml
schedule:
  - cron: "30 4 * * 1-5" # 10:00 AM IST
  - cron: "20 17 * * 1-5" # 10:50 PM IST (11:00 PM minus 10 min)
```

Then set secrets: `CLOCK_IN_START_AT=10:00`, `CLOCK_OUT_END_AT=23:00`.

### 5. Manual trigger (from phone or browser)

1. Go to your repo → **Actions** → **Qandle Auto Clock In/Out**
2. Click **Run workflow**
3. Select action: `clock-in` or `clock-out`

**From your iPhone:**

- Use the **GitHub mobile app** → navigate to your repo → Actions → Run workflow
- Or create an **iOS Shortcut** that calls the GitHub API:

```
POST https://api.github.com/repos/YOUR_USER/qandle-auto/actions/workflows/qandle.yml/dispatches
Headers: Authorization: Bearer YOUR_GITHUB_TOKEN
Body: {"ref": "main", "inputs": {"action": "clock-in"}}
```

## Holiday Format

The `HOLIDAYS` secret accepts comma-separated dates in any of these formats:

- `YYYY-MM-DD` (e.g. `2026-01-26`)
- `DD-MM-YYYY` (e.g. `26-01-2026`)
- `DD/MM/YYYY` (e.g. `26/01/2026`)

Example:

```
2026-01-26,2026-03-14,2026-08-15,2026-10-02,2026-11-04,2026-12-25
```

## GitHub Actions Budget

| Approach        | Minutes/Month | Within Free Tier? |
| --------------- | ------------- | ----------------- |
| **Two-cron**    | ~440          | Yes (2,000 free)  |
| Scheduler (old) | ~18,000+      | No                |

The two-cron approach uses ~440 min/month — well within GitHub's **2,000 min/month** free tier for private repos.
