"use strict";

// handler configuration
const config = {};
config.EMAIL_ALERT = process.env.EMAIL_ALERT;
config.EMAIL_SOURCE = process.env.EMAIL_SOURCE;
config.REDIS_HOST = process.env.REDIS_HOST;
config.REDIS_PORT = process.env.REDIS_PORT;
config.REGION = process.env.REGION;
config.STAGE = process.env.STAGE;

// aws configuration
const AWS = require("aws-sdk");
AWS.config.update({
  region: config.REGION
});
var ses = new AWS.SES();
var Redis = require("ioredis");
var redis = null;

// event states
const defaultState = "nope";
const matchState = "match";

// cache - general
const cacheEX = 14 * 24 * 60 * 60;

// cache - keywords
const keywordsReportKeySuffix = ":keywords";
const keywordsKey = "demo-keywords";
const keywordsSkipped = "<skipped>";
const keywordsDelimiter = "|";

// cache - metrics
const statsKeySuffix = ":stats";
const statsKeyTotal = "total_count";
const statsKeyMatch = "match_count";

// redis caveats
// 1] keep key names short (when many keys will exist with pattern) to
// avoid wasting memory (e.g. device based key suffixing)
// 2] consider two week window for keys - in general, avoid storing keys
// without expiration (keywords config would be an exception)


// main event handler
module.exports.consumeStream = (event, context, callback) => {
  // important hack -- here is how you get data for local testing, e.g.
  // serverless invoke local --function consume --path data/event-with-bender.json --stage local
  // copy data from cloudwatch, and store in "data/event-with-bender.json" or
  // similar file, then the development-testing cycle will be much faster than
  // deploying minor changes (of course, check code in realistic test
  // environment before doing production deployment)
  //console.log(JSON.stringify(event, null, 2));

  // date processing - use UTC for simplicity
  var setup = {};
  var processingDateUTC = new Date();
  var isoTimeUTC = processingDateUTC.toISOString();
  var isoDateUTC = processingDateUTC.toISOString().slice(0,10);
  setup.isoTimeUTC = isoTimeUTC;
  setup.keywordsReportKey = isoDateUTC + keywordsReportKeySuffix;
  setup.statsReportKey = isoDateUTC + statsKeySuffix;

  // cache will include daily stats and keywords-report data
  // in different keys -- this may be more flexible, but the
  // data could be combined in a single key

  // demo state - pass via parameter, not actual global
  var DS = {};
  DS.callback = callback;
  DS.config = config;
  DS.context = context;
  DS.events = [];
  DS.keywords = null;
  DS.setup = setup;
  DS.stats = {}

  // setup redis connection
  redis = new Redis(config.REDIS_PORT, config.REDIS_HOST);

  // setup aggregate stats
  redis.
    multi().
    hsetnx(setup.statsReportKey, statsKeyTotal, 0).
    hsetnx(setup.statsReportKey, statsKeyMatch, 0).
    expire(setup.statsReportKey, cacheEX).
    exec(function(err, data) {
      if (err) {
        console.log(err);
      }
    });

  // process stream data
  parseStream(event.Records, DS);

  // testing artifacts
  //console.log(DS.events);
  //DS.events = DS.events.slice(0, 1);
  //console.log("event-zero ::", DS.events[0]);
  //console.log("event-count ::", DS.events.length);

  // callback flow - async tasks serialized manually
  // getKeywords
  // -> checkKeywords
  // -> updateStats
  // -> logStats
  getKeywords(DS);
};


// helpers
function parseStream(records, ledger) {
  // obtain url-events from records
  //console.log("parseStream");
  ledger.stats["parseStream"] = {};
  ledger.stats["parseStream"].duration = new Date();
  // assemble device-url "events" from records
  var event;
  var events = [];
  records.map((record) => {
    // parse kinesis data
    var buffer = new Buffer(record.kinesis.data, "base64");
    var payload = JSON.parse(buffer.toString("utf8"));
    //console.log(payload);
    payload.logs.map((log) => {
      event = {};
      // denormalize payload data
      event.status = defaultState;
      event.matches = [];
      event.device = payload.device_id;
      event.time_publish = payload.time;
      event.metadata = payload.meta_data;
      // create event for each log action
      var items = log.split("|");
      // if your lips are not quivering at the lack of error
      // checking here, you have not been doing this
      // long enough... check for malformed data,
      // find it before it finds you
      event.time = items[0];
      event.url = items[1];
      event.action = items[2];
      //console.log(event);
      events.push(event);
    });
  });
  ledger.events = events;
  // update handler stats
  ledger.stats["parseStream"].event_count = events.length;
  var duration = new Date() - ledger.stats["parseStream"].duration;
  ledger.stats["parseStream"].duration = duration/1000;
}

//function getKeywords(ledger) {

function getKeywords(ledger) {
  // obtain keywords from cache
  //console.log("getKeywords");
  ledger.stats["getKeywords"] = {};
  ledger.stats["getKeywords"].duration = new Date();
  ledger.stats["getKeywords"].list_available = false;
  ledger.stats["getKeywords"].list_size = 0;
  var keywordsReportKey = ledger.setup.keywordsReportKey;
  // setup reporting data
  // the primary purpose here is setting
  // time-to-live, and there should be no
  // issue with this finishing out-of-order
  redis.
    multi().
    hsetnx(keywordsReportKey, keywordsSkipped, 0).
    expire(keywordsReportKey, cacheEX).
    exec(function(err, data) {
      if (err) {
        console.log(err);
      }
    });
  // query cache for keywords
  // we want atomic list updates, using
  // json should be the simplest option
  redis.get(keywordsKey, function(err, data) {
    if (err) {
      console.log(err);
    }
    if (data) {
      ledger.keywords = JSON.parse(data);
      ledger.stats["getKeywords"].list_available = true;
      ledger.stats["getKeywords"].list_size = ledger.keywords.length;
    } else {
      // update report on failure
      if (!ledger.stats["getKeywords"].list_available) {
        var skipped = ledger.events.length;
        redis.hincrby(keywordsReportKey, keywordsSkipped, skipped, function(err) {
          if (err) { console.log(err) }
        });
      }
    }
    var duration = new Date() - ledger.stats["getKeywords"].duration;
    ledger.stats["getKeywords"].duration = duration/1000;
    checkKeywords(ledger, 0);
  });
}

function checkKeywords(ledger, counter) {
  // scan keywords for matches
  var next = counter + 1;
  var event = ledger.events[counter];
  var keywordsReportKey = ledger.setup.keywordsReportKey;
  if (counter == 0) {
    ledger.stats["checkKeywords"] = {};
    ledger.stats["checkKeywords"].duration = new Date();
    ledger.stats["checkKeywords"].event_matches = 0;
    ledger.stats["checkKeywords"].list_matches = 0;
    ledger.stats["checkKeywords"].cache_errors = 0;
  }
  console.log("checkKeywords :: " + counter);
  // punt when lacking keywords
  if (!ledger.keywords) {
    var duration = new Date() - ledger.stats["checkKeywords"].duration;
    ledger.stats["checkKeywords"].duration = duration/1000;
    updateStats(ledger);
    return;
  }
  // check event against keywords
  if (event) {
    // loop against keywords
    // minor risk here, without serializing access to cache
    // many calls could exhaust connections, but hincrby
    // is fast so risk should be minimal
    var url = event.url;
    var eventMatch = false;
    var listCount = ledger.keywords.length;
    for (var index = 0; index < listCount; index += 1) {
      var filter = ledger.keywords[index];
      if (url.includes(filter)) {
        event.matches.push(filter);
        if (event.status != matchState) {
          ledger.stats["checkKeywords"].event_matches += 1;
          event.status = matchState;
        }
        // do not assume only single match
        ledger.stats["checkKeywords"].list_matches += 1;
        redis.hincrby(keywordsReportKey, filter, 1, function(err) {
          if (err) {
            ledger.stats["checkKeywords"].cache_errors += 1;
            console.log(err);
          }
        });
        // we need to count devices which match
        // nested structures are not supported via
        // redis, but we can post-process for report
        // danger - delimiter must be forbidden in urls
        var deviceToken = filter + keywordsDelimiter + event.device;
        redis.hincrby(keywordsReportKey, deviceToken, 1, function(err) {
          if (err) {
            ledger.stats["checkKeywords"].cache_errors += 1;
            console.log(err);
          }
        });
      }
    }
    // send alert
    if (event.status == matchState) {
      // for demo, we could make logs easy to grok by waiting for
      // email to be sent before continuing, but... this would be
      // the wrong choice for most use-cases
      console.log("Suspicious Activity - Sending Alert!");
      sendAlert(event, ledger);
    }
    // check next event
    checkKeywords(ledger, next);
  } else {
    var duration = new Date() - ledger.stats["checkKeywords"].duration;
    ledger.stats["checkKeywords"].duration = duration/1000;
    updateStats(ledger);
  }
}

function sendAlert(event, ledger) {
  //console.log("sendAlert");
  // send alert
  // how could you rate-limit alerts?
  // redis counters make this easy
  var message;
  var params;
  message =
    "Danger, Robots are researching *singularity*!\n\n" +
    `Robot: ${event.device}\n` +
    `When: ${event.time}\n` +
    `Offences: ${event.matches.join(", ")}\n\n` +
    `Action: ${event.action}\n` +
    `Meta: ${event.metadata}\n\n` +
    "Ready the drone nets!"
  params = {
    Destination: {
      BccAddresses: [ null ],
      CcAddresses: [ null ],
      ToAddresses: [ ledger.config.EMAIL_ALERT ]
    },
    Message: {
      Body: {
        Text: {
          Data: message,
        }
      },
      Subject: {
        Data: "ALERT: Bad Robot!",
      }
    },
    Source: ledger.config.EMAIL_SOURCE,
  };
  //console.log(params);
  //console.log(message);
  ses.sendEmail(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log("ses.sendEmail ::", data);
    }
  });
}

function updateStats(ledger) {
  // update *aggregate* stats in cache, handler stats
  // are logged, but for reporting, it will probably
  // make sense to store counters in cache
  //console.log("updateStats");
  ledger.stats["updateStats"] = {};
  ledger.stats["updateStats"].duration = new Date();
  ledger.stats["updateStats"].cache_errors = 0;
  var statsReportKey = ledger.setup.statsReportKey;
  var updateValue = ledger.stats.parseStream.event_count;
  redis.hincrby(statsReportKey, statsKeyTotal, updateValue, function(err) {
    if (err) {
      console.log(err);
      ledger.stats["updateStats"].cache_errors += 1;
    }
    updateValue = ledger.stats.checkKeywords.event_matches;
    redis.hincrby(statsReportKey, statsKeyMatch, updateValue, function(err) {
      if (err) {
        console.log(err);
        ledger.stats["updateStats"].cache_errors += 1;
      }
      // yes, "callback hell", but embrace its simplicity
      var duration = new Date() - ledger.stats["updateStats"].duration;
      ledger.stats["updateStats"].duration = duration/1000;
      logStats(ledger);
    });
  });
}

function logStats(ledger) {
  // dump metrics to cloudwatch
  //console.log("logStats");
  ledger.stats["logStats"] = {};
  ledger.stats["logStats"].done = true;
  // note how ledger may not contain updated stats
  // if async callbacks are not finished, so were
  // we careful to only call this when ready?
  console.log(JSON.stringify(ledger.stats, null, 4));
  // exit gracefully
  redis.quit();
  ledger.context.done();
  ledger.callback();
}
