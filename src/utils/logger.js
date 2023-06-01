const logger = (module.exports = {});

const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

logger.exception = (text) =>
  axios.post(process.env.WEBHOOK_URL, {
    text,
    icon_emoji: ":warning:",
    username: "mazacofo-exception",
  });
