import { SystemSetting } from "@/lib/models/SystemSetting"

/**
 * "À vérifier" delay in days — a parcel EN_COURS older than this is flagged
 * as needing verification with Navex/livreur. Configurable in Paramètres, default 3.
 */
export async function getVerifyDelay(): Promise<number> {
  // DB value (set from the Colis page) wins; env is only a default; else 3.
  try {
    const s = await SystemSetting.findOne({ key: "verifyDelayDays" }).lean<{ value?: any }>()
    const n = parseInt(String(s?.value ?? ""), 10)
    if (Number.isFinite(n) && n > 0) return n
  } catch { /* ignore */ }
  const env = parseInt(process.env.VERIFY_DELAY_DAYS || "", 10)
  if (Number.isFinite(env) && env > 0) return env
  return 3
}
