const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs')
const client = require('cheerio-httpcli');
const path = require('path')
const static = require('serve-static')

app.use('/', (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    let id = req.query.id;
    let url = "https://codeforces.com/api/user.info?handles=" + id;
    let userInfo = {
        id: "",
        rank: "",
        rating: "",
        maxRank: "",
        maxRating: ""
    };

    const TIER_COLOR = {
        newbie: "#CBCBCB",
        pupil: "#32D336",
        specialist: "#00D9CC",
        expert: "#656AFF",
        'candidate master': "#EE00EE",
        master: "#FF8C00",
        'international master': "#FF8C00",
        grandmaster: "#FC1212",
        'international grandmaster': "#FC1212",
        'legendary grandmaster': {
            firstLetter: "#000000",
            remains: "#FC1212"
        }
    };

    const RANK_EXP = {
        newbie: {
            min: 0,
            max: 1199
        },
        pupil: {
            min: 1200,
            max: 1399
        },
        specialist: {
            min: 1400,
            max: 1599
        },
        expert: {
            min: 1600,
            max: 1899
        },
        'candidate master': {
            min: 1900,
            max: 2099
        },
        master: {
            min: 2100,
            max: 2299
        },
        'international master': {
            min: 2300,
            max: 2399
        },
        grandmaster: {
            min: 2400,
            max: 2599
        },
        'international grandmaster': {
            min: 2600,
            max: 2999
        },
        'legendary grandmaster': {
            min: 3000,
            max: 5000
        }
    };
    client.fetch(url, {}, (err, $, result) => {
        let pInfo = JSON.parse($.html()).result;
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
        if (RANK_EXP[userInfo.rank] != undefined) {
          res.send(`
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="350" height="131" viewBox="0 0 350 131">
  <defs>
    <clipPath id="clip-맞춤형_크기_39">
      <rect width="350" height="131"/>
    </clipPath>
  </defs>
  <g id="맞춤형_크기_39" data-name="맞춤형 크기 – 39" clip-path="url(#clip-맞춤형_크기_39)">
    <rect width="350" height="131" fill="#fff"/>
    <rect id="CONTAINER" width="344" height="121" rx="20" transform="translate(3 5)" fill="#36393f"/>
    <g id="name_bar" data-name="name &amp; bar" transform="translate(0 15)">
      <text id="USER_ID" transform="translate(330 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1.8em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700" text-anchor="end"><tspan x="0" y="28">${userInfo.id}</tspan></text>
      <text id="USER_RANK" transform="translate(18 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700"><tspan x="0" y="0">${userInfo.rank}</tspan></text>
      <rect id="EXP_BAR" width="315" height="6" transform="translate(18 56)" fill="#707070"/>
      <rect id="CUR_EXP_BAR" width="${(userInfo.rating - RANK_EXP[userInfo.rank]['min'])/(RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315}" height="6" transform="translate(18 56)" fill="${TIER_COLOR[userInfo.rank]}"/>
      <text id="CUR_EXP" transform="translate(${(userInfo.rating - RANK_EXP[userInfo.rank]['min'])/(RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315 + 18} 73)" fill="${TIER_COLOR[userInfo.rank]}" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700"><tspan x="-12" y="0">${userInfo.rating}</tspan></text>
      <text id="MAX_EXP" transform="translate(310 73)" fill="${TIER_COLOR[userInfo.rank]}" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700"><tspan x="0" y="0">${RANK_EXP[userInfo.rank]['max']}</tspan></text>
    </g>
    <g id="max" transform="translate(-8 -18.573)">
      <text id="top_rating" transform="translate(26 132.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI" font-weight="600"><tspan x="0" y="0">top rating</tspan></text>
      <text id="max_rank" transform="translate(26 118.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI" font-weight="600"><tspan x="0" y="0">max rank</tspan></text>
      <text id="cur_mak_rank" transform="translate(100 105.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700"><tspan x="0" y="13">${userInfo.maxRank}</tspan></text>
      <text id="cur_top_rating" transform="translate(100 120.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI" font-weight="700"><tspan x="0" y="13">${userInfo.maxRating}</tspan></text>
    </g>
  </g>
</svg>

          `)
        }
    });
});
const server = app.listen(2021, () => {
    console.log('server has started on 2021');
})
