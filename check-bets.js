const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.ufwghleouumwlbrtdtqk:FiYbkD7a4xQdWhcF@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres' });
client.connect()
  .then(() => client.query('SELECT * FROM "K3Bet" WHERE "userId" = \'732f75cd-e887-4228-bfe6-834d30b8ea03\' ORDER BY "createdAt" DESC LIMIT 15'))
  .then(res => {
    console.log('Bets count:', res.rows.length);
    console.log('Recent Bets:', res.rows.map(r => ({ id: r.id, roundNumber: r.roundNumber, status: r.status, amount: r.amount, createdAt: r.createdAt })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
