import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const journals = sqliteTable("journals", { userId: text("user_id").primaryKey(), payload: text("payload").notNull(), revision: integer("revision").notNull().default(0) });
