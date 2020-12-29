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
    client.fetch(url, {}, (err, $, result) => {
        //res.header("Access-Control-Allow-Origin", "YOUR_SITE");
        let pInfo = JSON.parse($.html()).result;
        if (pInfo == undefined) {
            console.log('no id!!!!!!!!!!!!')
            return;
        }
        console.log(`rating : ${pInfo[0].rank}`)
        console.log(`rating : ${pInfo[0].rating}`)
    })
})
const server = app.listen(2021, () => {
    console.log('server has started on 2021');
})
