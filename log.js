'use strict';

const fs = require('fs')

module.exports = data => {
  fs.appendFile('log.txt', data + '\n', err => {
    if (err) throw err;
  });
};
