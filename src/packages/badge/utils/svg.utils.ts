import { TIER_COLOR, RANK_EXP, MINI_COLOR } from './cofo-rating-info';
import { Client } from '@/packages/client/entities/client.entity';

export class SvgUtils {
  static svgDataForLGM(client: Client): string {
    return `
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
  <text id="USER_ID" transform="translate(330 15)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="1.8em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700" text-anchor="end"><tspan x="0" y="28"><tspan fill="#000000">${
    client.handle[0]
  }</tspan><tspan fill="#FC1212">${client.handle.substring(
    1,
  )}</tspan></tspan></text>
  <text id="USER_RANK" transform="translate(18 15)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="1em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0" fill="#000000">L</tspan><tspan fill="#FC1212">egendary Grandmaster</tspan></text>
  <rect id="EXP_BAR" width="315" height="6" transform="translate(18 56)" fill="#000000"/>
  <rect id="CUR_EXP_BAR" width="${
    ((client.rating - RANK_EXP[client.rank]['min']) /
      (RANK_EXP[client.rank]['max'] - RANK_EXP[client.rank]['min'])) *
    315
  }" height="6" transform="translate(18 56)" fill="${TIER_COLOR[client.rank]}"/>
  <text id="CUR_EXP" transform="translate(${
    ((client.rating - RANK_EXP[client.rank]['min']) /
      (RANK_EXP[client.rank]['max'] - RANK_EXP[client.rank]['min'])) *
      315 +
    16
  } 73)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="-12" y="0">${
    client.rating
  }</tspan></text>
  </g>
  <g id="max" transform="translate(-8 -18.573)">
  <text id="top_rating" transform="translate(26 132.573)" fill="#000000" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">top rating</tspan></text>
  <text id="max_rank" transform="translate(26 118.573)" fill="#000000" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">max rank</tspan></text>
  ${
    client.maxRank.length === 21
      ? `<text id="cur_mak_rank" transform="translate(100 105.573)" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13" fill="#000">L</tspan><tspan y="13" fill="#FF0000">egendary Grandmaster</tspan></text>`
      : `<text id="cur_mak_rank" transform="translate(100 105.573)" fill="${
          // NOTE: 1등은 본인의 핸들이 maxRank로 보여진다.
          TIER_COLOR[client.maxRank] ?? 'black'
        }" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan y="13">${
          RANK_EXP[client.maxRank]?.displayName ?? client.maxRank
        }</tspan></text>`
  }
  <text id="cur_top_rating" transform="translate(100 120.573)" fill="${
    // NOTE: 1등은 본인의 핸들이 maxRank로 보여진다.
    TIER_COLOR[client.maxRank] ?? 'black'
  }" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13">${
    client.topRating
  }</tspan></text>
  </g>
  </g>
  </g>
  </svg>
  `;
  }

  static svgDataForGeneralRating(client: Client): string {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="350" height="131" viewBox="0 0 350 131">
  <defs>
  <clipPath id="clip-맞춤형_크기_39">
  <rect width="350" height="131"/>
  </clipPath>
  </defs>
  <g id="맞춤형_크기_39" data-name="맞춤형 크기 – 39" clip-path="url(#clip-맞춤형_크기_39)">
  <rect id="CONTAINER" width="344" height="121" rx="20" transform="translate(3 5)" fill="#36393f"/>
  <g id="name_bar" data-name="name &amp; bar" transform="translate(0 15)">
  <text id="USER_ID" transform="translate(330 15)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="1.8em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700" text-anchor="end"><tspan x="0" y="28">${
    client.handle
  }</tspan></text>
  <text id="USER_RANK" transform="translate(18 15)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="1em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0">${
    RANK_EXP[client.rank]['displayName']
  }</tspan></text>
  <rect id="EXP_BAR" width="315" height="6" transform="translate(18 56)" fill="#707070"/>
  <rect id="CUR_EXP_BAR" width="${
    ((client.rating - RANK_EXP[client.rank]['min']) /
      (RANK_EXP[client.rank]['max'] - RANK_EXP[client.rank]['min'])) *
    315
  }" height="6" transform="translate(18 56)" fill="${TIER_COLOR[client.rank]}"/>
  <text id="CUR_EXP" transform="translate(${
    ((client.rating - RANK_EXP[client.rank]['min']) /
      (RANK_EXP[client.rank]['max'] - RANK_EXP[client.rank]['min'])) *
      315 +
    16
  } 73)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="-12" y="0">${
    client.rating
  }</tspan></text>
  <text id="MAX_EXP" transform="translate(306 73)" fill="${
    TIER_COLOR[client.rank]
  }" font-size="0.75em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="0">${
    ((client.rating - RANK_EXP[client.rank]['min']) /
      (RANK_EXP[client.rank]['max'] - RANK_EXP[client.rank]['min'])) *
      315 +
      16 >=
    288
      ? ''
      : RANK_EXP[client.rank]['max']
  }</tspan></text>
  </g>
  <g id="max" transform="translate(-8 -18.573)">
  <text id="top_rating" transform="translate(26 132.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">top rating</tspan></text>
  <text id="max_rank" transform="translate(26 118.573)" fill="#fff" font-size="0.78em" font-family="SegoeUI-Semibold, Segoe UI, system-ui, -apple-system" font-weight="600"><tspan x="0" y="0">max rank</tspan></text>
  ${
    client.maxRank.length === 21
      ? `<text id="cur_mak_rank" transform="translate(100 105.573)" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13" fill="#000">L</tspan><tspan y="13" fill="#FF0000">egendary Grandmaster</tspan></text>`
      : `<text id="cur_mak_rank" transform="translate(100 105.573)" fill="${
          TIER_COLOR[client.maxRank]
        }" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan y="13">${
          RANK_EXP[client.maxRank]['displayName']
        }</tspan></text>`
  }
  <text id="cur_top_rating" transform="translate(100 120.573)" fill="${
    TIER_COLOR[client.maxRank]
  }" font-size="0.78em" font-family="SegoeUI-Bold, Segoe UI, system-ui, -apple-system" font-weight="700"><tspan x="0" y="13">${
    client.topRating
  }</tspan></text>
  </g>
  </g>
  </svg>
  
    `;
  }

  static svgDataMini(client: Client): string {
    const rank = client.rank;
    const rating = client.rating;
    const color = MINI_COLOR[rank];
    return `<!DOCTYPE svg PUBLIC
    "-//W3C//DTD SVG 1.1//EN"
    "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg height="20" width="110"
  version="1.1"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xml:space="preserve">
  <style type="text/css">
    <![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=block');
      @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
      .background {
        fill: url(#grad1);
      }
      text {
        fill: white;
        font-family: 'Noto Sans KR', sans-serif;
        font-size: 0.7em;
      }
      .gray-area {
        fill: #555555;
      }
      .tier {
        fill: ${rank == 'legendary grandmaster' ? 'black' : 'white'};
        font-weight: 700;
        font-size: 0.7em;
      }
    ]]>
  </style>
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="35%">
      <stop offset="20%" style="stop-color:${[color[0]]};stop-opacity:1" />
      <stop offset="55%" style="stop-color:${color[1]};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color[2]};stop-opacity:1" />
    </linearGradient>
    <clipPath id="round-corner">
      <rect x="0" y="0" width="110" height="20" rx="3" ry="3"/>
    </clipPath>
  </defs>
  <rect width="40" height="20" x="70" y="0" rx="3" ry="3" class="background"/>
  <rect width="75" height="20" clip-path="url(#round-corner)" class="gray-area"/>
  <text text-anchor="middle" alignment-baseline="middle" transform="translate(37.5, 11)">codeforces</text>
  <text class="tier" text-anchor="middle" alignment-baseline="middle" transform="translate(92, 11)">
  ${rating}
  </text>
</svg>`;
  }
}
