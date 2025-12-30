const path = require('path');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'meshwriter.min.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'production',
  optimization: {
    minimize: true
  }
};
