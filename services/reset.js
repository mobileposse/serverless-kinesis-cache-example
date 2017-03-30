"use strict";

// WHAT ARE WE DOING HERE?
// during testing, we may wish to flush cache

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


// main event handler
module.exports.resetCache = (event, context, callback) => {
  // setup redis connection
  redis = new Redis(config.REDIS_PORT, config.REDIS_HOST);

  // reveal consumer stats
  redis.flushdb(function (err, data) {
    if (err) return console.log(err);
    console.log(data);
    redis.quit();
  });
};
