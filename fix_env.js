const fs = require('fs');

let path = '.env';
let code = fs.readFileSync(path, 'utf8');

const newDbUrl = "postgresql://neondb_owner:npg_ED0IjOeUXC4Y@ep-ancient-mud-aya0mzt2-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const newDirectUrl = "postgresql://neondb_owner:npg_ED0IjOeUXC4Y@ep-ancient-mud-aya0mzt2.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

code = code.replace(/DATABASE_URL=".*"/g, `DATABASE_URL="${newDbUrl}"`);
code = code.replace(/DIRECT_URL=".*"/g, `DIRECT_URL="${newDirectUrl}"`);

fs.writeFileSync(path, code);
console.log('Updated .env file');
