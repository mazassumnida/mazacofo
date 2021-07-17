const cofo = module.exports = {};
const fs = require('fs');
const axios = require('axios');
const path = require('path');

cofo.getTier = async (id) => {
    try {
        const url = "https://codeforces.com/api/user.info?handles=" + id;
        const { data } = await axios.get(url)
        return data
    } catch (error) {
        console.error(error)
        return { status: "FAILED", result: [] }
    }
}