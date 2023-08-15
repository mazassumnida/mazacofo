import { CronJob } from "cron";

export const updateClientTiersEvery20thMinutes = () => {
  const job = new CronJob("0 */20 * * * *", cofoTask.updateCofo);
  job.start();
};
updateClientTiersEvery20thMinutes();
