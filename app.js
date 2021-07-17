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
  
  
  fs.stat('./memList/' + id + '.json', async (err1) => {
    // 첫 사용 유저이면, 존재하는 핸들인지 확인한다.
    if (err1) await getData.tier(id);
    fs.stat('./memList/' + id + '.json', async (err2) => {
      // 위에서 존재 확인한 핸들의 json 파일은 생성되도록 했지만
      // 존재하지 않는다면 err2로 빠진다.
      if (err2) return res.send('<svg>handle not available</svg>');
      // 첫 사용 유저였는데 파일은 생성되었다면 DB에 넣는다.
      else if (err1 && !err2) sql.insertId(id);

      fs.readFile('./memList/' + id + '.json', 'utf8', (err3, data) => {
        if (err3) { console.log(err3); return; }

        const pInfo = JSON.parse(data).result;
        if (pInfo == undefined) {
          console.log('no id!')
          return;
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