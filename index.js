#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');
const pjson = require('./package.json');
const root = './',
    exts = ['.jpg', '.png', '.jpeg'],
    max = 5200000; // 5MB == 5242848.754299136
const options = {
    method: 'POST',
    hostname: 'tinypng.com',
    path: '/web/shrink',
    headers: {
        rejectUnauthorized: false,
        'Postman-Token': Date.now(),
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'
    }
};
run(root);

function run(folder) {
    getSetting();
}

function getSetting() {
    let argvs = process.argv.slice(2);
    if (argvs[0] && argvs[0][0] === '-') {
        switch (argvs[0]) {
            case '-a':
            case '-all':
                fileDisplay(root);
                break;
            case '-p':
            case '-part':
                partImage();
                break;
            case '-v':
            case '--version':
                logVersion();
                exit();
                break;
            case '-h':
            case '--help':
                logHelp();
                exit();
                break;
            default:
                currentPathAll();
                break;
        }
    } else {
        currentPathAll();
    }
}
/**
 * Executable file
 */
function partImage() {
    let argvs = process.argv.slice(2);
    let partImage = argvs[1];
    if (
        argvs[1] &&
        fs.existsSync(partImage) &&
        fs.statSync(partImage).isFile() &&
        exts.includes(path.extname(partImage))
    ) {
        fileFilter(root + partImage);
    } else {
        console.log(partImage + 'incompressible');
    }
}

/**
 * Executes all under the current path
 */
function currentPathAll() {
    console.log('🍔 ===To compress=== ');
    fs.readdir(root, (err, files) => {
        if (err) {
            console.error(err);
        }
        files.forEach(file => {
            //If it is an image format to execute
            if (exts.includes(path.extname(file))) {
                fileFilter(file);
            }
        });
    });
}

/**
 * Filter file format
 * @param {IMAGE [path]} file
 */
function fileFilter(file) {
    fs.stat(root + file, (err, stats) => {
        if (err) return console.error(err);
        if (
            // Must be file, less than 5MB, suffix JPG || PNG || JPEG
            stats.size <= max &&
            stats.isFile() &&
            exts.includes(path.extname(file))
        ) {
            console.log(`🍟 Processing images:${file}`);
            fileUpload(file);
        }
    });
}
/**
 * Asynchronous API, compression image
 * @param {Address of picture}} img
 */
function fileUpload(img) {
    var req = https.request(options, function(res) {
        res.on('data', buf => {
            let obj = JSON.parse(buf.toString());
            if (obj.error) {
                console.log(
                    `[${img}]：Compression failure！errMessage：${obj.message}`
                );
            } else {
                fileUpdate(img, obj);
            }
        });
    });

    req.write(fs.readFileSync(img), 'binary');
    req.on('error', e => {
        console.error(e);
    });
    req.end();
}
// Update the picture
function fileUpdate(imgpath, obj) {
    let options = new URL(obj.output.url);
    let req = https.request(options, res => {
        let body = '';
        res.setEncoding('binary');
        res.on('data', function(data) {
            body += data;
        });
        res.on('end', function() {
            fs.writeFile(root + imgpath, body, 'binary', err => {
                if (err) return console.error(err);
                console.log(
                    `🍓 Handle a successful:${imgpath} Original size:${obj.input.size}b, Compressed size:${obj.output.size}b, Optimizing the proportion:${obj.output.ratio}b`
                );
            });
        });
    });
    req.on('error', e => {
        console.error(e);
    });
    req.end();
}

/**
 * File traversal method
 */
function fileDisplay(filePath) {
    fs.readdir(filePath, function(err, files) {
        if (err) {
            console.warn(err);
        } else {
            files.forEach(function(filename) {
                var filedir = path.join(filePath, filename);
                fs.stat(filedir, function(eror, stats) {
                    if (eror) {
                        console.warn('Get file stats failed');
                    } else {
                        var isFile = stats.isFile();
                        var isDir = stats.isDirectory();
                        if (isFile && exts.includes(path.extname(filedir))) {
                            fileFilter(filedir);
                        }
                        if (isDir) {
                            fileDisplay(filedir);
                        }
                    }
                });
            });
        }
    });
}

/**
 * Shows version
 */
function logVersion() {
    console.log(pjson.version);
}

/**
 * Exit from application with code
 *
 * @param {number} [code=0]
 */
function exit(code) {
    if (!code) {
        code = 0;
    }

    process.exit(code);
}

/**
 * Shows help message
 */
function logHelp() {
    const message = `
Usage: tinypng [options] 
Options:
  -a, --all      \tModify all images under the file.
  -p, --part     \t Processing of specified files,use: tinypng -p  [image.png|*.png|*.jpeg|*.jpg]
  -h, --help         \tThis message.
  -v, --version      \tShow version.
`;

    console.log(message);
}