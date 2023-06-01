const cofo = (module.exports = {});
const axios = require("axios");
const sql = require("./sql");
const logger = require("./logger");

cofo.getTier = async (id) => {
  const url = "https://codeforces.com/api/user.info?handles=" + id;

  try {
    const { data } = await axios.get(url);
    return data;
  } catch (error) {
    console.error(error);

    const { ok, changedHandle } = await checkForChangedHandle(id);
    if (ok) {
      return await cofo.getTier(changedHandle);
    }

    const reg = new RegExp("handles: User with handle (.*?) not found");
    const errorMessage = error.response.data.comment;
    const matched = errorMessage.match(reg);
    if (matched && matched[1]) sql.removeClient(matched[1]);

    logger.exception(`${error.response.data.comment} and was removed.`);

    return { status: "FAILED", result: [] };
  }
};

const checkForChangedHandle = async (handle) => {
  try {
    await axios.head(`https://codeforces.com/profile/${handle}`, {
      maxRedirects: 0,
    });
  } catch (e) {
    const response = e.response;

    if (response.status === 302) {
      const movedURL = response.headers.location;
      return {
        ok: true,
        changedHandle: movedURL.replace("https://codeforces.com/profile/", ""),
      };
    }
  }

  return {
    ok: false,
    changedHandle: null,
  };
};
