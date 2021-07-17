const mysql2 = require('mysql2');
const dotenv = require('dotenv');
const cofo = require('../utils/cofo');
const sql = require('../utils/sql')
dotenv.config()
const connection = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PW,
  database: process.env.MYSQL_DB
});
const run = (async () => {
  const clients = await sql.getClients()
  clients.map(async ({ handle }) => {
    const { status, result } = await cofo.getTier(handle)
    if (status === "FAILED") return

    const isExisting = await sql.checkIfExists(handle)
    !isExisting && await sql.insertData(result)
    isExisting && await sql.updateRank(result)
  })

})()
setInterval(() => {
  run()
}, 3600000);
console.log('get cf data intervally');