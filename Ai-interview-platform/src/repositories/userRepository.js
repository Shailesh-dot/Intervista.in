import { supabase } from '../config/supabase.js';

// Table/column names driven by .env so no hardcoded schema assumptions
const CONFIGS = {
  candidate: {
    table:          process.env.CANDIDATE_TABLE          || 'candidates',
    idColumn:       process.env.CANDIDATE_ID_COLUMN      || 'id',
    emailColumn:    process.env.CANDIDATE_EMAIL_COLUMN   || 'email',
    verifiedColumn: process.env.CANDIDATE_VERIFIED_COLUMN || 'email_verified'
  },
  hr: {
    table:          process.env.HR_TABLE          || 'company_hr',
    idColumn:       process.env.HR_ID_COLUMN      || 'id',
    emailColumn:    process.env.HR_EMAIL_COLUMN   || 'email',
    verifiedColumn: process.env.HR_VERIFIED_COLUMN || 'email_verified'
  }
};

function getConfig(userType) {
  const cfg = CONFIGS[userType];
  if (!cfg) throw new Error(`Unsupported user type: ${userType}`);
  return cfg;
}

export async function findUserByEmail({ userType, email }) {
  const cfg = getConfig(userType);
  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .ilike(cfg.emailColumn, email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findUserById({ userType, userId }) {
  const cfg = getConfig(userType);
  const { data, error } = await supabase
    .from(cfg.table)
    .select('*')
    .eq(cfg.idColumn, String(userId))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function markEmailVerified({ userType, userId }) {
  const cfg = getConfig(userType);
  const { error } = await supabase
    .from(cfg.table)
    .update({ [cfg.verifiedColumn]: true })
    .eq(cfg.idColumn, String(userId));
  if (error) throw error;
}

export { getConfig };
