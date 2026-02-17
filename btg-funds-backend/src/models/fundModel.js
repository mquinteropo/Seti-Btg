require('dotenv').config();
const AWS = require('aws-sdk');
const TABLE_NAME = process.env.FUNDS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
exports.getFundById = async (id) => {
  // Buscar por nombre del fondo usando Scan
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: '#name = :fundName',
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':fundName': id
    }
  };
  const result = await dynamoDb.scan(params).promise();
  if (!result.Items || result.Items.length === 0) return null;
  const item = result.Items[0];
  return {
    id,
    name: item.name,
    minAmount: item.minAmount,
    category: item.category
  };
};
