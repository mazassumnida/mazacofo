const express = require("express");
const app = express();
const cofo = require("./utils/cofo");
const sql = require("./utils/sql");
const {
  svgDataForLGM,
  svgDataForGeneralRating,
  svgDataMini,
} = require("./utils/SVGs");

app.use("/", async (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");

  // handle errors
  const id = req.query.id;
  const mini = req.query.mini;

  if (!id) return res.send("<svg>handle cannot be empty</svg>");
  const handleFormat = id.replace(/[a-zA-Z0-9-_]/g, "");
  if (handleFormat)
    return res.send(
      "<svg>handle should only contain Latin letters, digits, underscore or dash characters</svg>",
    );

  // get user rank, rating
  const { status, userInfo } = await getUserInfo(id);
  if (status === "FAILED") return res.send("<svg>handle not available</svg>");

  // handle errors
  if (!userInfo.rank) {
    return res.send("<svg>rating not available</svg>");
  }

  // render svg
  console.log(mini);
  if (mini) {
    res.send(svgDataMini(userInfo));
  } else if (userInfo.rank === "legendary grandmaster") {
    res.send(svgDataForLGM(userInfo));
  } else res.send(svgDataForGeneralRating(userInfo));
});

const getUserInfo = async (id) => {
  const userInfo = {
    id: "",
    rank: "",
    rating: "",
    maxRank: "",
    maxRating: "",
  };

  const { exists, rows } = await sql.getClient(id);
  if (!exists) {
    const { status, result } = await cofo.getTier(id);
    // not available handle in codeforces
    if (status === "FAILED") return { status, userInfo };

    // insert newly added handle data
    await sql.insertData(result[0]);
    userInfo.id = id;
    userInfo.rank = result[0].rank;
    userInfo.rating = result[0].rating;
    userInfo.maxRank = result[0].maxRank;
    userInfo.maxRating = result[0].maxRating;
  } else {
    // showing existing data
    userInfo.id = id;
    userInfo.rank = rows[0].rank;
    userInfo.rating = rows[0].rating;
    userInfo.maxRank = rows[0].maxRank;
    userInfo.maxRating = rows[0].topRating;
  }
  return { status: "SUCCESS", userInfo };
};

const server = app.listen(2021, () => {
  console.log("server has started on 2021");
});
