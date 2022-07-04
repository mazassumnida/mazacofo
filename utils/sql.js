const sql = (module.exports = {});
const mysql2 = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();
const connection = mysql2.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PW,
  database: process.env.MYSQL_DB,
});
sql.insertData = async ({ handle, rank, rating, maxRank, maxRating }) => {
  if (!handle) return;
  try {
    const [rows] = await connection.query(
      "INSERT INTO clients(clients.handle, clients.rank, clients.rating, clients.maxRank, clients.topRating) VALUES(?, ?, ?, ?, ?)",
      [handle, rank, rating, maxRank, maxRating],
    );
  } catch (error) {
    console.error(error);
  }
};
sql.updateRank = async ({ handle, rank, rating, maxRank, maxRating }) => {
  if (!handle) return;
  try {
    const [rows] = await connection.query(
      `UPDATE clients AS c SET c.rank=?, c.rating=?, c.maxRank=?, c.topRating=? WHERE c.handle=?`,
      [rank, rating, maxRank, maxRating, handle],
    );
  } catch (error) {
    console.error(error);
  }
};
sql.getClient = async (id) => {
  try {
    const [rows] = await connection.query(
      `SELECT * FROM clients WHERE handle=?`,
      [id],
    );
    const exists = rows?.length ? true : false;
    return { exists, rows };
  } catch (error) {
    console.error(error);
  }
};
sql.getClients = async () => {
  try {
    const [rows] = await connection.query(`SELECT * FROM clients`);
    return rows;
  } catch (error) {
    console.error(error);
  }
};
