import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { env } from "./env";
import { logger } from "../utils/logger";

let memoryServer: MongoMemoryServer | undefined;

export async function connectDb() {
  mongoose.set("strictQuery", true);

  const mongoUri = env.useMemoryDb
    ? await MongoMemoryServer.create().then((server) => {
        memoryServer = server;
        return server.getUri();
      })
    : env.mongoUri;

  await mongoose.connect(mongoUri);
  logger.info(
    {
      mongoUri: env.useMemoryDb ? "mongodb-memory-server" : mongoUri.replace(/\/\/.*@/, "//***@")
    },
    "MongoDB connected"
  );
}

export async function disconnectDb() {
  await mongoose.disconnect();
  await memoryServer?.stop();
}
