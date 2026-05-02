import { connectDb, disconnectDb } from "./config/db";
import { seedDemoData } from "./services/demoSeed";
import { ensureMediaDirs } from "./utils/media";

async function seed() {
  await ensureMediaDirs();
  await connectDb();
  await seedDemoData();
  await disconnectDb();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDb();
  process.exit(1);
});
