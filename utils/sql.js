const sql = module.exports = {};
const mysql2 = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config()
const connection = mysql2.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PW,
    database: process.env.MYSQL_DB
})
sql.insertData = async ({ handle, rank, rating, maxRank, maxRating }) => {
    if (!handle) return;
    try {
        const [rows] = await connection.query('INSERT INTO clients(handle, rank, rating, maxRank, topRating) VALUES(?)', [handle, rank, rating, maxRank, maxRating])
    } catch (error) {
        console.error(error)
    }
}
sql.updateRank = async ({ handle, rank, rating, maxRank, maxRating }) => {
    if (!handle) return;
    try {
        const [rows] = await connection.query('UPDATE clients SET rank=?, rating=?, maxRank=?, topRating=? WHERE handle=?', [rank, rating, maxRank, maxRating, handle])
    } catch (error) {
        console.error(error)
    }
}
sql.checkIfExists = async (id) => {
    try {
        const [rows] = await connection.query(`SELECT * FROM clients WHERE handle=?`, [id])
        const ret = rows?.length ? true : false
        return ret
    } catch (error) {
        console.error(error)
    }
}
sql.getClients = async () => {
    try {
        const [rows] = await connection.query(`SELECT * FROM clients`)
        return rows
    } catch (error) {
        console.error(error)
    }
}