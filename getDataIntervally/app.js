const mysql2 = require('mysql2');
const dotenv = require('dotenv');
const getData = require('../utils/getData');
dotenv.config()
const connection = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PW,
  database: process.env.MYSQL_DB
});
(() => {
  connection.query('SELECT * FROM clients', (err, res, fields) => {
    if (err) return console.log(err)
    res.map(async (val) => {
      await getData.tier(val.handle);
    })
  })
})();
setInterval(() => {
  connection.query('SELECT * FROM clients', (err, res, fields) => {
    if (err) return console.log(err)
    res.map(async (val) => {
      await getData.tier(val.handle);
    })
  })
}, 3600000);
console.log('get cf data intervally');