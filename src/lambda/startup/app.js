const AWS = require("aws-sdk");

const startInstance = require("./start");

// Set region
AWS.config.update({ region: "ap-southeast-1" });

// Create publish parameters
const params = {
  Message: "ScheduleLambda Shutdown mysql rds" /* required */,
  TopicArn: process.env.SNS_TOPIC_ARN
};

exports.lambdaHandler = async (event, context) => {
  const instanceIdentifier = process.env.INSTANCE_IDENTIFIER;
  const result = await startInstance(instanceIdentifier);

  // Create promise and SNS service object
  const publishTextPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
    .publish(params)
    .promise();

  // Handle promise's fulfilled/rejected states
  await publishTextPromise
    .then(data => {
      console.log(
        `Message ${params.Message} send sent to the topic ${params.TopicArn}`
      );
      console.log("MessageID is " + data.MessageId);
    })
    .catch(function(err) {
      console.error(err, err.stack);
    });

  return {
    statusCode: 200,
    body: result
  };
};
