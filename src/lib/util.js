base64Encode = (str) => Buffer.from(str, 'utf8').toString('base64');
base64Decode = (str) => Buffer.from(str, 'base64').toString('utf8');

module.exports = { base64Encode, base64Decode };
