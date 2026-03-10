import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEMO_FAMILY_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_OWNER_ID = '11111111-1111-1111-1111-111111111111';
const DEMO_CHILD_NAME = '孩子A';

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

async function seedDemoScene() {
  const env = await loadLocalEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase env for demo seeding.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error: familyError } = await supabase
    .from('families')
    .upsert({ id: DEMO_FAMILY_ID, owner_user_id: DEMO_OWNER_ID }, { onConflict: 'id' });
  if (familyError) throw new Error(`Seed families failed: ${familyError.message}`);

  const { data: existingChildren, error: childQueryError } = await supabase
    .from('children')
    .select('id, display_name')
    .eq('family_id', DEMO_FAMILY_ID);
  if (childQueryError) throw new Error(`Query children failed: ${childQueryError.message}`);

  let childId = existingChildren?.find((c) => c.display_name === DEMO_CHILD_NAME)?.id;
  if (!childId) {
    childId = crypto.randomUUID();
    const { error: childInsertError } = await supabase.from('children').insert({
      id: childId,
      family_id: DEMO_FAMILY_ID,
      display_name: DEMO_CHILD_NAME
    });
    if (childInsertError) throw new Error(`Insert child failed: ${childInsertError.message}`);
  }

  const { error: pointsError } = await supabase.from('child_points').upsert(
    {
      family_id: DEMO_FAMILY_ID,
      child_name: DEMO_CHILD_NAME,
      wallet_balance: 260,
      weekly_points: 135
    },
    { onConflict: 'family_id,child_name' }
  );
  if (pointsError) throw new Error(`Seed child points failed: ${pointsError.message}`);

  const { error: settingsError } = await supabase
    .from('family_settings')
    .upsert(
      {
        family_id: DEMO_FAMILY_ID,
        auto_approve_default: false,
        auto_publish_daily_default: true,
        auto_publish_templates: []
      },
      { onConflict: 'family_id' }
    );
  if (settingsError) throw new Error(`Seed family settings failed: ${settingsError.message}`);

  const { error: cleanupRewardsError } = await supabase
    .from('reward_items')
    .delete()
    .eq('family_id', DEMO_FAMILY_ID);
  if (cleanupRewardsError) throw new Error(`Cleanup rewards failed: ${cleanupRewardsError.message}`);

  const rewards = [
    { family_id: DEMO_FAMILY_ID, category: 'food', title: '冰淇淋', cost: 30, stock: 8, is_active: true },
    { family_id: DEMO_FAMILY_ID, category: 'book', title: '故事书', cost: 80, stock: 4, is_active: true },
    { family_id: DEMO_FAMILY_ID, category: 'custom', title: '晚睡 30 分钟', cost: 120, stock: null, is_active: true }
  ];
  const { error: rewardInsertError } = await supabase.from('reward_items').insert(rewards);
  if (rewardInsertError) throw new Error(`Insert rewards failed: ${rewardInsertError.message}`);

  return {
    familyId: DEMO_FAMILY_ID,
    childId,
    childName: DEMO_CHILD_NAME
  };
}

seedDemoScene()
  .then((result) => {
    console.log(JSON.stringify(result));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
