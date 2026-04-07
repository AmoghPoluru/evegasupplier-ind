import "dotenv/config";
import { seedDressSuppliers } from "./seed";

seedDressSuppliers().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
