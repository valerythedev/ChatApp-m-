export function assertProductionSafeToStart(): void {
  if (process.env.NODE_ENV !== "production") return;

  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error(
      "NODE_ENV=production: set JWT_SECRET to a strong value (at least 32 characters).",
    );
  }

  const db = process.env.DATABASE_URL?.trim() ?? "";
  if (!db) {
    throw new Error("NODE_ENV=production: DATABASE_URL is required.");
  }
  if (!db.startsWith("postgresql://") && !db.startsWith("postgres://")) {
    throw new Error("NODE_ENV=production: DATABASE_URL must be a PostgreSQL connection URL.");
  }
}
