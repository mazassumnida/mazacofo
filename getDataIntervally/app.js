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
const run = async () => {
  const clientList = await sql.getClients()
  const clientStr = clientList.reduce((prev, { handle }) => `${handle};${prev}`, "")
  const { status, result } = await cofo.getTier(clientStr)
  if (status === "FAILED") return

  result.map(async ({ handle }, index) => {
    const {exists, rows} = await sql.getClient(handle)
    !exists && await sql.insertData(result[index])
    exists && await sql.updateRank(result[index])
  })
}
run()
setInterval(() => {
  run()
}, 3600000);
console.log('get cf data intervally');