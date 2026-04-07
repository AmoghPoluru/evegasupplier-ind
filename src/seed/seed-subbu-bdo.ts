import "dotenv/config";
import { ensureSubbuBdoUserAndAssignAll } from "./seed";

/**
 * Assign subbu.poluru@gmail.com as BDO on every vendor and buyer (creates user if missing).
 * Does not run dress suppliers / sample orders — use only on existing DBs.
 */
ensureSubbuBdoUserAndAssignAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ BDO assignment failed:", error);
    process.exit(1);
  });
