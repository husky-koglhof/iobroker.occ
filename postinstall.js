var path = require("path");
var fs = require('fs');

var targetPath = path.join('www');
var sourcePath = path.join('node_modules', 'fullcalendar', 'dist');

var files = ['fullcalendar.js', 'fullcalendar.css', 'gcal.js', 'lang-all.js'];

for (var i=0; i<files.length; i++) {
    var sourceFile = path.join(sourcePath, files[i]);
    var targetFile = path.join(targetPath, files[i]);
    fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
}