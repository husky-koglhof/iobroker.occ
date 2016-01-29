var path = require("path");
var fs = require('fs');

function copyFileSync( source, target ) {

    var targetFile = target;

    //if target is a directory a new file with the same name will be created
    if ( fs.existsSync( target ) ) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join( target, path.basename( source ) );
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    //copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                copyFileSync( curSource, targetFolder );
            }
        } );
    }
}

var targetPath = path.join('www');
var sourcePath = path.join('node_modules', 'fullcalendar', 'dist');
var oldfiles = ['fullcalendar.js', 'fullcalendar.css', 'gcal.js', 'lang-all.js'];
var newfiles = [];
// No longer needed, we are using jqwidgets scheduler
/*
 for (var i=0; i<files.length; i++) {
 var sourceFile = path.join(sourcePath, files[i]);
 var targetFile = path.join(targetPath, files[i]);
 fs.writeFileSync(targetFile, fs.readFileSync(sourceFile));
 }
 */

// Cleanup old Structure
for (var i=0; i<oldfiles.length; i++) {
    var sourceFile = path.join(sourcePath, oldfiles[i]);
    try {
        fs.unlinkSync(sourceFile);
    } catch(e) {

    }
}

// Create new Structure
copyFolderRecursiveSync("node_modules/jqwidgets-framework/jqwidgets", "www/js");