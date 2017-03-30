"use strict";

// WHAT ARE WE DOING HERE?
// normally, configuration-in-cache would be set via
// web interface or command like (e.g. redis-cli), but
// for simplicity, we use a service, but this is all about
// learning to love functions-as-a-service, so when you
// have a problem, please consider creating a fuction
//
// when testing, set config using aws console via "test"
// to see changes in config leads to matches, update
// configHot to *true*, deploy and reset config
//
// coldKeywords will match "bender" data (when produce
// is in test mode), whereas hotKeywords will match the
// other devices

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
const coldKeywords = ["doge-memes", "mild-stuffs", "robot-matchmaking"];
const hotKeywords = ["horrible-materials", "bad-stuffs", "4chan", "4chan.com"];
const configKey = "demo-keywords";
const configHot = false;

// main event handler
module.exports.configureKeywords = (event, context, callback) => {
  var configKeywords;

  // setup redis connection
  redis = new Redis(config.REDIS_PORT, config.REDIS_HOST);

  if (configHot) {
    configKeywords = JSON.stringify(hotKeywords);
  } else {
    configKeywords = JSON.stringify(coldKeywords);
  }

  redis.set(configKey, configKeywords, function(err, data) {
    if (err) return console.log("Config Update Failed :: ", err);
    // log update of config
    redis.get(configKey, function(err, data) {
      console.log("Config Updated :: ", data);
        // please rewind
        redis.quit();
        callback();
    });
  });
};
