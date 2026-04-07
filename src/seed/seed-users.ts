import "dotenv/config";
import { seedAdminUser } from "./seed";

seedAdminUser().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
