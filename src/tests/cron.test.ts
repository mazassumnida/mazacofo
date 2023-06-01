/* eslint-disable no-new */
const sinon = require("sinon");
const cron = require("cron");

describe("cron", () => {
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  describe("with cron", () => {
    it("should run every hour (0 */60 * * * *)", (done) => {
      const callback = jest.fn();
      const job = new cron.CronJob("0 */60 * * * *", callback, null, true);

      expect(callback).not.toBeCalled();

      clock.tick(60 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(1);

      clock.tick(60 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(2);

      clock.tick(60 * 60 * 1000);
      expect(callback).toHaveBeenCalledTimes(3);

      job.stop();
      clock.restore();

      done();
    });
  });
});
