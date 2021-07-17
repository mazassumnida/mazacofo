const express = require('express');
const app = express();
const getData = require('./utils/getData');
const sql = require('./utils/sql');
const fs = require('fs')
const { RANK_EXP, TIER_COLOR } = require('./utils/cofoRatingInfo')
const { svgDataForLGM, svgDataForGeneralRating } = require('./utils/SVGs')

app.use('/', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const id = req.query.id;
  if (!id) return res.send('<svg>handle cannot be empty</svg>');
  const handleFormat = id.replace(/[a-zA-Z0-9-_]/g,'')
  if(handleFormat) return res.send('<svg>handle should only contain Latin letters, digits, underscore or dash characters</svg>');
  
  const userInfo = {
    id: "",
    rank: "",
    rating: "",
    maxRank: "",
    maxRating: ""
  };
  
  const { exists, rows } = await sql.getClient(id)
  if (!exists) {
    const { status, result } = await cofo.getTier(id)
    if (status === "FAILED") return { status, userInfo }
    await sql.insertData(result[0])
    userInfo.id = id;
    userInfo.rank = result[0].rank;
    userInfo.rating = result[0].rating;
    userInfo.maxRank = result[0].maxRank;
    userInfo.maxRating = result[0].maxRating;
  } else {
    userInfo.id = id;
    userInfo.rank = rows[0].rank;
    userInfo.rating = rows[0].rating;
    userInfo.maxRank = rows[0].maxRank;
    userInfo.maxRating = rows[0].topRating;
  }

        userInfo.id = id;
        userInfo.rank = pInfo[0].rank;
        userInfo.rating = pInfo[0].rating;
        userInfo.maxRank = pInfo[0].maxRank;
        userInfo.maxRating = pInfo[0].maxRating;
        // 중복호출시 userInfo.rank가 null인 상태로 호출된다
        // 왜 중복호출될까..
        if (!RANK_EXP[userInfo.rank]) {
          return res.send('<svg>rating not available</svg>');
        }

        if (userInfo.rank === "Legendary Grandmaster") {
          res.send(svgDataForLGM(userInfo))
        } else
          res.send(svgDataForGeneralRating(userInfo))
      });
    })
  })
});
const server = app.listen(2021, () => {
  console.log('server has started on 2021');
})