const getData = module.exports = {};
const fs = require('fs');
const axios = require('axios');
const path = require('path');
getData.tier = (id) => {
    return new Promise((resolve, reject) => {
        const url = "https://codeforces.com/api/user.info?handles=" + id;
        axios
            .get(url)
            .then(res => {
                fs.writeFile(path.resolve(__dirname, '../memList/' + id + '.json'), JSON.stringify(res.data), 'utf8', () => {
                    resolve();
                })
            })
            .catch(() => resolve())
    })
}