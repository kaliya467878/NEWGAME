const { Pool } = require("pg");
const path = require("path");
// Load env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function run() {
  const connectionString = process.env.DATABASE_URL;
  console.log("Connecting to:", connectionString ? connectionString.substring(0, 30) + "..." : "undefined");
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'LedgerType'
    `);
    console.log("Enum values for LedgerType in DB:", res.rows.map(r => r.enumlabel));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
