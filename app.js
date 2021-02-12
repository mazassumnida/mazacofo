const express = require('express');
const app = express();
const getData = require('./functional/getData');
const sql = require('./functional/sql');
const fs = require('fs')

app.use('/', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  // res.setHeader('cache-control', 'no-cache');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (!req.query.id) return;
  const id = req.query.id;
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
    'legendary grandmaster': "#FC1212"
  };

  const RANK_EXP = {
    newbie: {
      displayName: "Newbie",
      min: 0,
      max: 1199
    },
    pupil: {
      displayName: "Pupil",
      min: 1200,
      max: 1399
    },
    specialist: {
      displayName: "Specialist",
      min: 1400,
      max: 1599
    },
    expert: {
      displayName: "Expert",
      min: 1600,
      max: 1899
    },
    'candidate master': {
      displayName: "Candidate Master",
      min: 1900,
      max: 2099
    },
    master: {
      displayName: "Master",
      min: 2100,
      max: 2299
    },
    'international master': {
      displayName: "International Master",
      min: 2300,
      max: 2399
    },
    grandmaster: {
      displayName: "Grandmaster",
      min: 2400,
      max: 2599
    },
    'international grandmaster': {
      displayName: "International Grandmaster",
      min: 2600,
      max: 2999
    },
    'legendary grandmaster': {
      displayName: "Legendary Grandmaster",
      min: 3000,
      max: 5000
    }
  };
  fs.stat('./memList/' + id + '.json', async (err1) => {
    // 첫 사용 유저이면, 존재하는 핸들인지 확인한다.
    if (err1) await getData.tier(id);
    fs.stat('./memList/' + id + '.json', async (err2) => {
      // 위에서 존재 확인한 핸들의 json 파일은 생성되도록 했지만
      // 존재하지 않는다면 err2로 빠진다.
      if (err2) return res.send('<svg>HANDLE NOT AVAILABLE</svg>');
      // 첫 사용 유저였는데 파일은 생성되었다면 DB에 넣는다.
      else if (err1 && !err2) sql.insertId(id);

      fs.readFile('./memList/' + id + '.json', 'utf8', (err3, data) => {
        if (err3) { console.log(err3); return; }

        let pInfo = JSON.parse(data).result;
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
          if (userInfo.rank.length == 21) {
            res.send(`
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="350" height="131" viewBox="0 0 350 131">
  <defs>
    <clipPath id="clip-맞춤형_크기_39">
      <rect width="350" height="131"/>
    </clipPath>
  </defs>
  <g id="맞춤형_크기_39" data-name="맞춤형 크기 – 39" clip-path="url(#clip-맞춤형_크기_39)">
  <g id="CONTAINER" fill="#FFFFFF">
    <path d="M20,0H324a20,20,0,0,1,20,20v81a20,20,0,0,1-20,20H20A20,20,0,0,1,0,101V20A20,20,0,0,1,20,0Z" stroke="none"/>
    <path d="M 20 0.5 C 17.3673095703125 0.5 14.81362915039063 1.0155029296875 12.40985107421875 2.032180786132813 C 10.08792114257813 3.014320373535156 8.002410888671875 4.42041015625 6.211395263671875 6.211410522460938 C 4.42041015625 8.002410888671875 3.014312744140625 10.08790588378906 2.032196044921875 12.40986633300781 C 1.0155029296875 14.81363677978516 0.5 17.36731719970703 0.5 20 L 0.5 101 C 0.5 103.632682800293 1.0155029296875 106.1863632202148 2.032196044921875 108.5901336669922 C 3.014312744140625 110.9120941162109 4.42041015625 112.9975891113281 6.211395263671875 114.7885894775391 C 8.002410888671875 116.57958984375 10.08792114257813 117.9856796264648 12.40985107421875 118.9678192138672 C 14.81362915039063 119.9844970703125 17.3673095703125 120.5 20 120.5 L 324 120.5 C 326.6326904296875 120.5 329.1863708496094 119.9844970703125 331.5901489257813 118.9678192138672 C 333.9120788574219 117.9856796264648 335.9975891113281 116.57958984375 337.7886047363281 114.7885894775391 C 339.57958984375 112.9975891113281 340.9856872558594 110.9120941162109 341.9678039550781 108.5901336669922 C 342.9844970703125 106.1863632202148 343.5 103.632682800293 343.5 101 L 343.5 20 C 343.5 17.36731719970703 342.9844970703125 14.81363677978516 341.9678039550781 12.40986633300781 C 340.9856872558594 10.08790588378906 339.57958984375 8.002410888671875 337.7886047363281 6.211410522460938 C 335.9975891113281 4.42041015625 333.9120788574219 3.014320373535156 331.5901489257813 2.032180786132813 C 329.1863708496094 1.0155029296875 326.6326904296875 0.5 324 0.5 L 20 0.5 M 20 0 L 324 0 C 335.0456848144531 0 344 8.954315185546875 344 20 L 344 101 C 344 112.0456848144531 335.0456848144531 121 324 121 L 20 121 C 8.954315185546875 121 0 112.0456848144531 0 101 L 0 20 C 0 8.954315185546875 8.954315185546875 0 20 0 Z" stroke="none" fill="#aaa"/>
    <g id="name_bar" data-name="name &amp; bar" transform="translate(0 15)">
      <text id="USER_ID" transform="translate(330 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1.8em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700" text-anchor="end"><tspan x="0" y="28"><tspan fill="#000000">${userInfo.id[0]}</tspan><tspan fill="#FC1212">${userInfo.id.substring(1)}</tspan></tspan></text>
      <text id="USER_RANK" transform="translate(18 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0" fill="#000000">L</tspan><tspan fill="#FC1212">egendary Grandmaster</tspan></text>
      <rect id="EXP_BAR" width="315" height="6" transform="translate(18 56)" fill="#000000"/>
      <rect id="CUR_EXP_BAR" width="${(userInfo.rating - RANK_EXP[userInfo.rank]['min']) / (RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315}" height="6" transform="translate(18 56)" fill="${TIER_COLOR[userInfo.rank]}"/>
      <text id="CUR_EXP" transform="translate(${(userInfo.rating - RANK_EXP[userInfo.rank]['min']) / (RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315 + 16} 73)" fill="${TIER_COLOR[userInfo.rank]}" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="-12" y="0">${userInfo.rating}</tspan></text>
    </g>
    <g id="max" transform="translate(-8 -18.573)">
      <text id="top_rating" transform="translate(26 132.573)" fill="#000000" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">top rating</tspan></text>
      <text id="max_rank" transform="translate(26 118.573)" fill="#000000" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">max rank</tspan></text>
      ${userInfo.maxRank.length == 21 ? `<text id="cur_mak_rank" transform="translate(100 105.573)" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13" fill="#000">L</tspan><tspan y="13" fill="#FF0000">egendary Grandmaster</tspan></text>` : `<text id="cur_mak_rank" transform="translate(100 105.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan y="13">${RANK_EXP[userInfo.maxRank]['displayName']}</tspan></text>`}
      <text id="cur_top_rating" transform="translate(100 120.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13">${userInfo.maxRating}</tspan></text>
    </g>
  </g>
  </g>
</svg>
`)
          } else
            res.send(`
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="350" height="131" viewBox="0 0 350 131">
  <defs>
    <clipPath id="clip-맞춤형_크기_39">
      <rect width="350" height="131"/>
    </clipPath>
  </defs>
  <g id="맞춤형_크기_39" data-name="맞춤형 크기 – 39" clip-path="url(#clip-맞춤형_크기_39)">
    <rect id="CONTAINER" width="344" height="121" rx="20" transform="translate(3 5)" fill="#36393f"/>
    <g id="name_bar" data-name="name &amp; bar" transform="translate(0 15)">
      <text id="USER_ID" transform="translate(330 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1.8em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700" text-anchor="end"><tspan x="0" y="28">${userInfo.id}</tspan></text>
      <text id="USER_RANK" transform="translate(18 15)" fill="${TIER_COLOR[userInfo.rank]}" font-size="1em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0">${RANK_EXP[userInfo.rank]['displayName']}</tspan></text>
      <rect id="EXP_BAR" width="315" height="6" transform="translate(18 56)" fill="#707070"/>
      <rect id="CUR_EXP_BAR" width="${(userInfo.rating - RANK_EXP[userInfo.rank]['min']) / (RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315}" height="6" transform="translate(18 56)" fill="${TIER_COLOR[userInfo.rank]}"/>
      <text id="CUR_EXP" transform="translate(${(userInfo.rating - RANK_EXP[userInfo.rank]['min']) / (RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315 + 16} 73)" fill="${TIER_COLOR[userInfo.rank]}" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="-12" y="0">${userInfo.rating}</tspan></text>
      <text id="MAX_EXP" transform="translate(306 73)" fill="${TIER_COLOR[userInfo.rank]}" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0">${(userInfo.rating - RANK_EXP[userInfo.rank]['min']) / (RANK_EXP[userInfo.rank]['max'] - RANK_EXP[userInfo.rank]['min']) * 315 + 16 >= 288 ? '' : RANK_EXP[userInfo.rank]['max']}</tspan></text>
    </g>
    <g id="max" transform="translate(-8 -18.573)">
      <text id="top_rating" transform="translate(26 132.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">top rating</tspan></text>
      <text id="max_rank" transform="translate(26 118.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">max rank</tspan></text>
      ${userInfo.maxRank.length == 21 ? `<text id="cur_mak_rank" transform="translate(100 105.573)" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13" fill="#000">L</tspan><tspan y="13" fill="#FF0000">egendary Grandmaster</tspan></text>` : `<text id="cur_mak_rank" transform="translate(100 105.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan y="13">${RANK_EXP[userInfo.maxRank]['displayName']}</tspan></text>`}
      <text id="cur_top_rating" transform="translate(100 120.573)" fill="${TIER_COLOR[userInfo.maxRank]}" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13">${userInfo.maxRating}</tspan></text>
    </g>
  </g>
</svg>

          `)
        }
      });
    })
  })
});
const server = app.listen(2021, () => {
  console.log('server has started on 2021');
})
