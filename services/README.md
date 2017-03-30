demo services
====

This is a Serverless Kinesis stream processing demo.

The demo was developed using a Vagrant development environment, but you may use Docker or your host, so long as you are cognizant of the nodejs version required by AWS Lambda.

Test data is provided for local testing of the configure, consume and report handlers. The producer must be tested via in the AWS "test" environment.

## Assumptions

Configuration as code is marvelous. But it can also lead one to a dark place.

For all this to work, you should have (or create) subnets (private and public) and security group for redis, and a simple, single shard Kinesis stream in the same region.

You could skip the SES, any notification service could work. A good explaination of the nextwork setup (public subnet with igw routing and associated nat, and corresponding private subnet with local and nat routing) is found on stackoverflow ["AWS: Sending email through SES from Lambda"](http://stackoverflow.com/questions/38379117/aws-sending-email-through-ses-from-lambda).

The essence of the exercise is to show how simple and pragmatic it can be to glean analytics from a stream. The example data is purposefully kept trivial, but it would help greatly to understand this is for processing 100s of millions of log entries per day.

If the data were crucial for generating revenue, you would be storing it in Redshift (or a similar store), but even S3 can become costly when adding ~40GB or more per day (as value must be proportional to utility, and S3 is cheapest when data gathers dust.).

For much less cost, one can perform various real-time analytics for various purposes, and store results in cache. We should how alerting could be used when appropriate.

Stream processing does not have to be expensive and complicated...

We are experimenting with options for infrastructure provisioning to simplify the demo.

## Deploying Services

Your environment must have appropriate AWS credentials.

```
$ vagrant ssh
$ cd /opt/demo
$ serverless deploy --stage test
```

When developing in your host, use `services` as your working directory.

You should also know how to deploy a single function, to simplify testing...

```
$ serverless deploy function -f publish --stage test
```

## Local Testing

Comments in the publish, configure and report script files are helpful for understanding the setup. Configuration starts out with the "cold" keywords, which will not match any data in the default stream (without "bender" logs).

Changing the config to use the "hot" keywords will find matches in the default data.

Alternatively, altering publish to include "bender" data will show a match using the default "cold" keywords... Perhaps this is too pedantic, but one would expect different results when data or configuration evolves, and the test data allows us to test these scenarios.

Add configuration to your local redis cache...

```
$ serverless invoke local --function configure --stage local
```

Run "standard" data through the consumer...

```
$ serverless invoke local --function consume --path data/event-wout-bender.json --stage local
```

Run "test" data throught the consumer...

```
$ serverless invoke local --function consume --path data/event-with-bender.json --stage local
```
