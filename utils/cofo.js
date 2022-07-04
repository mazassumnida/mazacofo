const cofo = (module.exports = {});
const axios = require("axios");

cofo.getTier = async (id) => {
  try {
    const url = "https://codeforces.com/api/user.info?handles=" + id;
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);
    return { status: "FAILED", result: [] };
  }
};
