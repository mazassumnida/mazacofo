import "dotenv/config";

import express from "express";

import { getUserTierDataAndUpdateClient } from "packages/codeforces/services/user-profile/user-profile-service";
import {
  svgDataForLGM,
  svgDataForGeneralRating,
  svgDataMini,
} from "./utils/SVGs";

const app = express();

app.get("/", async (req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");

  const id = req.query.id as string;
  const mini = req.query.mini as string;

  if (!id) return res.send("<svg>handle cannot be empty</svg>");
  const handleFormat = id.replace(/[a-zA-Z0-9-_]/g, "");
  if (handleFormat) {
    return res.send(
      "<svg>handle should only contain Latin letters, digits, underscore or dash characters</svg>",
    );
  }

  try {
    const userProfile = await getUserTierDataAndUpdateClient(id);
    if (!userProfile.rank) {
      return res.send("<svg>rating not available</svg>");
    }

    if (mini) {
      return res.send(svgDataMini(userProfile));
    } if (userProfile.rank === "legendary grandmaster") {
      return res.send(svgDataForLGM(userProfile));
    }

    return res.send(svgDataForGeneralRating(userProfile));
  } catch (e) {
    console.error(e);
  }

  return res.send("<svg>handle not available</svg>");
});

app.listen(2021, () => {
  console.log("server has started on 2021");
});
