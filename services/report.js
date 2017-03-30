"use strict";

// WHAT ARE WE DOING HERE?
// analytics/stats are stored in cache, these would be migrated
// to a durable store, or distributed via email, but for simplicity
// we will merely log the values
//
// when testing locally, it is easiest to just use redis-cli, but for
// aws resources, your security group should ensure traffic is
// local or otherwise secure (forbearance is wise)

// handler configuration
const config = {};
config.REDIS_HOST = process.env.REDIS_HOST;
config.REDIS_PORT = process.env.REDIS_PORT;
config.REGION = process.env.REGION;
config.STAGE = process.env.STAGE;

// aws configuration
const AWS = require("aws-sdk");
AWS.config.update({
  region: config.REGION
});
var Redis = require('ioredis');
var redis = null;

// keyword options
const keywordsReportKeySuffix = ":keywords"
const statsKeySuffix = ":stats"

// main event handler
module.exports.reportMetrics = (event, context, callback) => {
  // date processing - use UTC for simplicity
  var processingDateUTC = new Date();
  var isoTimeUTC = processingDateUTC.toISOString();
  var isoDateUTC = processingDateUTC.toISOString().slice(0,10);
  var keywordsReportKey = isoDateUTC + keywordsReportKeySuffix;
  var statsReportKey = isoDateUTC + statsKeySuffix;

  // setup redis connection
  redis = new Redis(config.REDIS_PORT, config.REDIS_HOST);

  // reveal consumer stats
  redis.hgetall(statsReportKey, function (err, data) {
    if (err) return console.log("Fail Checking Stats ::", err);
    console.log("Stats ::", data);
    // reveal keywords report
    redis.hgetall(keywordsReportKey, function (err, data) {
      if (err) return console.log("Fail Checking Keywords Report ::", err);
      console.log("Report ::", data);
      // please rewind
      redis.quit();
      callback();
    });
  });
};
