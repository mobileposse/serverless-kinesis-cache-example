"use strict";

// WHAT ARE WE DOING HERE?
// here we have mock producer fixture things
// robots are curious, they sneak surfing the web
// but we have secret logging -- note how the data is
// generic and the date format could be thought human
// these things you may find in the real world, but
// this data for educational entertainment and
// no robots were harmed, we promise
//
// for testing, to see match against "coldKeywords" config
// change injectMatch to true and deploy this fuction

// handler configuration
const config = {};
config.REGION = process.env.REGION;
config.STAGE = process.env.STAGE;
config.STREAM = process.env.STREAM;

// aws configuration
const AWS = require("aws-sdk");
AWS.config.update({
  region: config.REGION
});
var kinesis = null;

// test hack
const injectMatch = false;

const robot_01 = {
  "device_id": "r2d2",
  "time": "Feb 13, 2017 11:44:18 PM",
  "meta_data": "mork",
  "logs": [
    "Feb 13, 2017 11:03:18 PM|http://www.google.com/|1",
    "Feb 13, 2017 11:23:18 PM|http://www.youtube.com/|2",
    "Feb 13, 2017 11:33:18 PM|http://www.facebook.com/|1",
    "Feb 13, 2017 11:33:18 PM|http://www.yahoo.com/|4"
  ]
}

const robot_02 = {
  "device_id": "c3p0",
  "time": "Mar 8, 2017 10:24:38 AM",
  "meta_data": "mindy",
  "logs": [
    "Mar 8, 2017 6:18:02 AM|http://www.facebook.com/|1",
    "Mar 8, 2017 7:08:31 AM|http://www.yahoo.com/|4",
    "Mar 8, 2017 7:12:43 AM|http://www.twitter.com/|1",
    "Mar 8, 2017 9:53:42 AM|http://www.spotify.com/|3",
    "Mar 8, 2017 10:20:22 AM|http://www.4chan.com/|2"
  ]
}

const robot_03 = {
  "device_id": "astro-boy",
  "time": "Mar 14, 2017 9:50:32 AM",
  "meta_data": "bubble-tea",
  "logs": [
    "Mar 14, 2017 8:24:41 AM|http://www.google.com/|1",
    "Mar 14, 2017 8:25:00 AM|http://www.youtube.com/|2",
    "Mar 14, 2017 9:02:40 AM|http://www.twitter.com/|1",
    "Mar 14, 2017 9:44:20 AM|http://www.4chan.com/|2"
  ]
}

const robot_04 = {
  "device_id": "bender",
  "time": "Mar 23, 2017 7:38:46 PM",
  "meta_data": "cold-brew",
  "logs": [
    "Mar 23, 2017 1:33:41 PM|http://www.google.com/|1",
    "Mar 23, 2017 1:45:01 PM|http://www.spotify.com/|3",
    "Mar 23, 2017 5:23:31 PM|http://www.robot-matchmaking.com/|1",
    "Mar 23, 2017 6:56:27 PM|http://www.yahoo.com/|4"
  ]
}


// main event handler
module.exports.publishStream = (event, context, callback) => {
  var payload;

  // setup kinesis connection
  kinesis = new AWS.Kinesis();

  // push payload-01
  payload = robot_01;
  var params = {
    Data: JSON.stringify(payload),
    PartitionKey: payload.device_id,
    StreamName: config.STREAM
  };
  kinesis.putRecord(params, function(err, data) {
    if (err) console.log(err, err.stack);
    console.log("kinesis-publish :: ", data);
  });

  // push payload-02
  payload = robot_02;
  var params = {
    Data: JSON.stringify(payload),
    PartitionKey: payload.device_id,
    StreamName: config.STREAM
  };
  kinesis.putRecord(params, function(err, data) {
    if (err) console.log(err, err.stack);
    console.log("kinesis-publish :: ", data);
  });

  // push payload-03
  payload = robot_03;
  var params = {
    Data: JSON.stringify(payload),
    PartitionKey: payload.device_id,
    StreamName: config.STREAM
  };
  kinesis.putRecord(params, function(err, data) {
    if (err) console.log(err, err.stack);
    console.log("kinesis-publish :: ", data);
  });

  // push payload-04
  if (injectMatch) {
    console.log("Test Mode :: Inject Matching Data [for coldKeywords config]");
    payload = robot_04;
    var params = {
      Data: JSON.stringify(payload),
      PartitionKey: payload.device_id,
      StreamName: config.STREAM
    };
    kinesis.putRecord(params, function(err, data) {
      if (err) console.log(err, err.stack);
      console.log("kinesis-publish :: ", data);
    });
  }

  // shibboleth
  callback();
}
