const cofo = (module.exports = {});
const axios = require("axios");

const logger = require("./logger");

cofo.getTier = async (id) => {
  try {
    const url = "https://codeforces.com/api/user.info?handles=" + id;
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);
    logger.exception(error.response.data.comment);
    return { status: "FAILED", result: [] };
  }
};
