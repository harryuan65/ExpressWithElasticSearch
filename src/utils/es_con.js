const { Client } = require('@elastic/elasticsearch');
var client = new Client({node: 'http://localhost:9200'});
module.exports = client;