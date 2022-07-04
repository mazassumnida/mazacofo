const cofoTask = (module.exports = {});

const cofo = require("../utils/cofo");
const sql = require("../utils/sql");
const dotenv = require("dotenv");
dotenv.config();

cofoTask.updateCofo = async () => {
  const clientList = await sql.getClients();
  const clientStr = clientList.reduce(
    (prev, { handle }) => `${handle};${prev}`,
    "",
  );
  const { status, result } = await cofo.getTier(clientStr);
  if (status === "FAILED") return;

  result.map(async ({ handle }, index) => {
    const { exists, rows } = await sql.getClient(handle);
    !exists && (await sql.insertData(result[index]));
    exists && (await sql.updateRank(result[index]));
  });
};
