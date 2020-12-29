const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs')
const client = require('cheerio-httpcli');
const path = require('path')
const static = require('serve-static')

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use('/views', static(path.join(__dirname, '/views')));

app.use('/', (req, res) => {
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
        pupil: "#00A800",
        specialist: "#00D9CC",
        expert: "#656AFF",
        candidateMaster: "#EE00EE",
        master: "#FF8C00",
        internationalMaster:"#FF8C00",
        grandMaster: "#FF0000",
        internationalGrandMaster:"#FF0000",
        legendaryGrandMaster: {
            firstLetter: "#000000",
            remains: "#FF0000"
        }
    };

    const RANK_EXP = {
        newbie: {
            min:0,
            max:1199
        },
        pupil: {
            min:1200,
            max:1399
        },
        specialist: {
            min:1400,
            max:1599
        },
        expert: {
            min:1600,
            max:1899
        },
        candidateMaster: {
            min:1900,
            max:2099
        },
        Master: {
            min:2100,
            max:2299
        },
        internationalMaster:{
            min:2300,
            max:2399
        },
        grandMaster: {
            min:2400,
            max:2599
        },
        internationalGrandMaster:{
            min:2600,
            max:2999
        },
        legendaryGrandMaster: {
            min:3000,
            max:"dontknow.."
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

        res.send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="381" height="105.309" viewBox="0 0 381 105.309">
            <style type="text/css">
                <![CDATA[
                    @import url(https://cdn.jsdelivr.net/npm/segoe-fonts@1.0.1/segoe-fonts.min.css);
                ]]>
            </style>
            <g id="패스_1" data-name="패스 1" fill="#36393f">
                <path d="M 323 105.1590118408203 L 19 105.1590118408203 C 8.606082916259766 105.1590118408203 0.1500000059604645 99.68563842773438 0.1500000059604645 92.95796966552734 L 0.1500000059604645 12.35105228424072 C 0.1500000059604645 5.623385429382324 8.606082916259766 0.1500104963779449 19 0.1500104963779449 L 323 0.1500104963779449 C 333.3939208984375 0.1500104963779449 341.8500061035156 5.623385429382324 341.8500061035156 12.35105228424072 L 341.8500061035156 92.95796966552734 C 341.8500061035156 99.68563842773438 333.3939208984375 105.1590118408203 323 105.1590118408203 Z" stroke="none"/>
                <path d="M 19 0.3000106811523438 C 8.68878173828125 0.3000106811523438 0.29998779296875 5.706092834472656 0.29998779296875 12.35105133056641 L 0.29998779296875 92.95796966552734 C 0.29998779296875 99.60292816162109 8.68878173828125 105.0090103149414 19 105.0090103149414 L 323 105.0090103149414 C 333.3112182617188 105.0090103149414 341.7000122070312 99.60292816162109 341.7000122070312 92.95796966552734 L 341.7000122070312 12.35105133056641 C 341.7000122070312 5.706092834472656 333.3112182617188 0.3000106811523438 323 0.3000106811523438 L 19 0.3000106811523438 M 19 7.62939453125e-06 L 323 7.62939453125e-06 C 333.493408203125 7.62939453125e-06 342 5.529762268066406 342 12.35105133056641 L 342 92.95796966552734 C 342 99.77925872802734 333.493408203125 105.3090133666992 323 105.3090133666992 L 19 105.3090133666992 C 8.506591796875 105.3090133666992 0 99.77925872802734 0 92.95796966552734 L 0 12.35105133056641 C 0 5.529762268066406 8.506591796875 7.62939453125e-06 19 7.62939453125e-06 Z" stroke="none"/>
            </g>
            <g id="name_bar" data-name="name &amp; bar" transform="translate(-7 1)">
                <text id="Master" transform="translate(23 30)" fill="#ff8c00" font-size="16" font-family="Segoe UI Bold, Segoe UI"><tspan x="0" y="0">${userInfo.rank}</tspan></text>
                <text id="" transform="translate(23 38)" fill="#ff8c00" font-size="26" font-family="Segoe UI Bold, Segoe UI"><tspan x="0" y="20">${userInfo.id}</tspan></text>
                <rect id="사각형_1" data-name="사각형 1" width="315" height="6" transform="translate(19 73)" fill="#ff8c00"/>
                <rect id="사각형_2" data-name="사각형 2" width="105" height="6" transform="translate(229 73)" fill="#707070"/>
                <text id="_1300" data-name="1300" transform="translate(219 90)" fill="#ff8c00" font-size="10" font-family="Segoe UI Semibold, Segoe UI" font-weight="700"><tspan x="0" y="0">${userInfo.rating}</tspan></text>
                <text id="_1900" data-name="1900" transform="translate(311 90)" fill="#ff8c00" font-size="10" font-family="Segoe UI Semibold, Segoe UI" font-weight="700"><tspan x="0" y="0">1900</tspan></text>
            </g>
            <g id="max" transform="translate(188 -77.573)">
                <text id="maxRank" transform="translate(20 104)" fill="#fff" font-size="12" font-family="Segoe UI Semibold, Segoe UI"><tspan x="0" y="0">Max Rank</tspan></text>
                <text id="TopRating_" data-name="TopRating"
            transform="translate(20 129)" fill="#fff" font-size="12" font-family="Segoe UI Semibold"><tspan x="0" y="0">Top Rating</tspan><tspan font-family="Segoe UI Semibold, Segoe UI" font-weight="600"><tspan x="0" y="14"></tspan></tspan></text>
                <text id="Master-2" data-name="Master" transform="translate(20 106)" fill="#e0e" font-size="12" font-family="Segoe UI Bold, Segoe UI" font-weight="700"><tspan x="0" y="9">${userInfo.maxRank}</tspan></text>
                <text id="_2200" data-name="2200" transform="translate(20 133)" fill="#e0e" font-size="12" font-family="Segoe UI Bold, Segoe UI" font-weight="700"><tspan x="0" y="9">${userInfo.maxRating}</tspan></text>
            </g>
    </svg>
    `)
    })

    // TODO: 랭크별 경험치
    // TODO: 경험치 바


})
const server = app.listen(2021, () => {
    console.log('server has started on 2021');
})
