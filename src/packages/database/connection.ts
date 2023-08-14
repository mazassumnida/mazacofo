import mysql2 from "mysql2/promise";

export const connection = mysql2.createPool({
  uri: process.env.DATABASE_URL,
});
