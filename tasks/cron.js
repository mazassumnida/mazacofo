const CronJob = require('cron').CronJob;

// Update Codeforces data every hour
const cofoTask = require("./cofoTask");
const job = new CronJob('0 * */1 * * *', cofoTask.updateCofo);
job.start();