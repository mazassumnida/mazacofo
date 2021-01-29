const sql = module.exports = {};
const mysql2 = require('mysql2');
const dotenv = require('dotenv');
dotenv.config()
const connection = mysql2.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PW,
    database: process.env.MYSQL_DB
})
sql.insertId = (id) => {
    if (!id) return;
    connection.query('INSERT INTO clients(handle) VALUES(?)', [id], (err, res, fields) => {
        if (err) console.log(err);
    })
}