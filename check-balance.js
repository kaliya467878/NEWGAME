const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ufwghleouumwlbrtdtqk:FiYbkD7a4xQdWhcF@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
client.connect()
  .then(() => client.query('SELECT * FROM "Wallet" WHERE "userId" = \'732f75cd-e887-4228-bfe6-834d30b8ea03\' LIMIT 1'))
  .then(res => {
    console.log('Wallet:', res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
