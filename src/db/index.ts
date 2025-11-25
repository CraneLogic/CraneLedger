import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/index.js';
import * as schema from './schema.js';

// Create postgres connection
const queryClient = postgres(config.DATABASE_URL);

// Create drizzle instance
export const db = drizzle(queryClient, { schema });

// Export schema for use in other modules
export * from './schema.js';
