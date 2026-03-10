import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const baseUrl = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3000';
const chromePath =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const repoRoot = path.resolve(process.cwd(), 'show-the-work');
const artifactsDir = path.join(repoRoot, 'artifacts');
const screenshotsDir = path.join(artifactsDir, 'screenshots');
const rawVideoDir = path.join(artifactsDir, 'raw-video');
const flowNotesPath = path.join(artifactsDir, 'DEMO_FLOW_NOTES.md');

const timestamp = Date.now();
const demoEmail = `kingby.demo.${timestamp}@example.com`;
const demoPassword = `DemoPass!${String(timestamp).slice(-6)}`;
const demoPin = '2468';

const steps = [];
const execFileAsync = promisify(execFile);

async function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const content = await fs.readFile(envPath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    env[key] = value;
  }
  return env;
}

async function ensureDemoUser(email, password) {
  const env = await loadLocalEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) return { ok: false, reason: 'missing_env' };

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });

  if (response.ok) return { ok: true, mode: 'created' };

  const result = await response.json().catch(() => ({}));
  const message = String(result?.msg ?? result?.message ?? '');
  if (response.status === 422 || message.toLowerCase().includes('already registered')) {
    return { ok: true, mode: 'exists' };
  }
  return { ok: false, reason: message || `status_${response.status}` };
}

async function seedDemoScene() {
  const { stdout } = await execFileAsync('node', ['show-the-work/scripts/seed_demo_scene.mjs'], {
    cwd: process.cwd()
  });
  const parsed = JSON.parse(stdout.trim());
  return {
    familyId: parsed.familyId,
    childId: parsed.childId,
    childName: parsed.childName
  };
}

async function ensureDirs() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  await fs.mkdir(rawVideoDir, { recursive: true });
}

async function capture(page, name, note) {
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(screenshotsDir, `${name}.png`),
    fullPage: true
  });
  steps.push({ file: `${name}.png`, note, url: page.url() });
  console.log(`Captured ${name}: ${note}`);
}

async function run() {
  await ensureDirs();

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: ['--disable-gpu', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    const demoScene = await seedDemoScene();

    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('name@email.com').fill(demoEmail);
    await page.getByPlaceholder('密码（至少 6 位）').fill(demoPassword);
    await capture(page, '01-register-form', 'Registration entry point and parent account setup');

    await page.getByRole('button', { name: '注册' }).click();
    await page.waitForTimeout(1200);
    await capture(page, '02-register-feedback', 'Registration feedback and system response');

    await page.goto(`${baseUrl}/parent/tutorial`, { waitUntil: 'domcontentloaded' });
    await capture(page, '03-parent-tutorial', 'Parent onboarding and capability introduction');

    await page.goto(`${baseUrl}/parent/tasks/new`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('family_id（UUID，例如 00000000-0000-0000-0000-000000000001）').fill(
      demoScene.familyId
    );
    await page.getByPlaceholder('任务名称（例如：背 20 个单词）').fill('英语单词复习 20 分钟');
    await page.getByRole('button', { name: '文字' }).click();
    await page.getByRole('button', { name: '+ 添加孩子' }).click();
    await page.getByRole('button', { name: '生成任务预览' }).click();
    await capture(page, '04-task-design-preview', 'Task templates, assignment, and publish-preview flow');

    await page.goto(`${baseUrl}/parent/rivals`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('family_id UUID').fill(demoScene.familyId);
    await page.getByRole('button', { name: '重新抽' }).click();
    await capture(page, '05-rivals-config', 'Rivals setup for motivation and leaderboard context');

    await page.goto(`${baseUrl}/parent/approvals`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('family_id UUID').fill(demoScene.familyId);
    await page.getByRole('button', { name: '加载待审批' }).click();
    await page.waitForTimeout(800);
    await capture(page, '06-approval-center', 'Approval center for review and quality control');

    await page.goto(
      `${baseUrl}/child?preview=1&familyId=${encodeURIComponent(demoScene.familyId)}&child=${encodeURIComponent(
        demoScene.childName
      )}&childId=${encodeURIComponent(demoScene.childId)}`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(1200);
    await capture(page, '07-child-dashboard', 'Child view with task board and ranking context');

    const shopButton = page.getByRole('button', { name: '我家的商店' });
    const shopButtonByAria = page.getByLabel('打开奖励商城');
    const hasShopButton = (await shopButton.count()) > 0 || (await shopButtonByAria.count()) > 0;
    if (hasShopButton) {
      let opened = false;
      if ((await shopButton.count()) > 0 && (await shopButton.first().isEnabled())) {
        await shopButton.first().click();
        opened = true;
      } else if ((await shopButtonByAria.count()) > 0 && (await shopButtonByAria.first().isEnabled())) {
        await shopButtonByAria.first().click();
        opened = true;
      }
      if (opened) {
        await page.waitForTimeout(800);
        await capture(page, '08-reward-shop', 'Reward shop and incentive loop interface');
        const closeButton = page.getByRole('button', { name: '关闭商城' });
        if ((await closeButton.count()) > 0) await closeButton.first().click();
      }
    }

    await page.getByRole('button', { name: '家长端' }).click();
    await page.waitForTimeout(500);
    const pinInput = page.getByPlaceholder('输入 PIN');
    if ((await pinInput.count()) > 0) {
      await pinInput.fill(demoPin);
    }
    await capture(page, '09-secure-parent-return', 'PIN gate for secure parent console return');

    const video = page.video();
    await context.close();

    const rawVideoPath = await video.path();
    console.log(`Raw video: ${rawVideoPath}`);

    await fs.writeFile(
      flowNotesPath,
      [
        '# Demo Flow Notes',
        '',
        `- Generated at: ${new Date().toISOString()}`,
        `- Base URL: ${baseUrl}`,
        `- Demo account email: ${demoEmail}`,
        `- Demo PIN: ${demoPin}`,
        '',
        '## Captured Steps',
        ...steps.map((step, index) => `${index + 1}. \`${step.file}\` - ${step.note}`),
        '',
        '## Raw Video',
        `- ${rawVideoPath}`
      ].join('\n'),
      'utf8'
    );

    console.log('Demo flow capture completed.');
  } catch (error) {
    await context.close();
    throw error;
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
