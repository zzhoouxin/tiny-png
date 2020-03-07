#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const {URL} = require('url');
const chalk = require('chalk');
const pjson = require('./package.json');
const options_path = `${__dirname}/settings.json`;
const root = './',
    exts = ['.jpg', '.png', '.jpeg'],
    max = 5200000; // 5MB == 5242848.754299136
var count = 0;
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
let optionsKey = {};
run(root);

function run(folder) {
    getSetting();
}


function getSetting() {
    let argvs = process.argv.slice(2);
    if (argvs[0] && argvs[0][0] === '-') {
        switch (argvs[0]) {
            case '-k':
            case '--api-key':
                setOption('api_key', argvs[1]);
                break;
            case '-a':
            case '--all':
                statisticsTheNumber(root, true)
                if (count > 19) {
                    getOptions();
                    fileDisplay(root, true);
                    return;
                }
                fileDisplay(root);
                break;
            case '-p':
            case '--part':
                partImage();
                break;
            case '-c':
            case '--current':
                statisticsTheNumber(root, false)
                if (count > 19) {
                    getOptions();
                    currentPathAll(true);
                    return;
                }
                currentPathAll(false);
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
                logHelp();
                break;
        }
    } else {
        logHelp();
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
function currentPathAll(isUseKey) {
    let ccount = 0;
    let files = fs.readdirSync(root);
    files.forEach(file => {
        //If it is an image format to execute
        if (exts.includes(path.extname(file))) {
            fileFilter(file, isUseKey);
            ccount += 1;
        }
    });
    if (ccount === 0) {
        console.error(chalk.red("😂 Error:There are no images in the current directory"))
        process.exit(1)
    }
}

/**
 * Filter file format
 * @param {IMAGE [path]} file
 */
function fileFilter(file, isUseKey) {
    fs.stat(root + file, (err, stats) => {
        if (err) return console.error(err);
        if (
            // Must be file, less than 5MB, suffix JPG || PNG || JPEG
            stats.size <= max &&
            stats.isFile() &&
            exts.includes(path.extname(file))
        ) {
            console.log(`🍟 Processing images:${file}`);
            isUseKey ? fileUploadUseKey(file) : fileUpload(file)
        }
    });
}

/**
 * Asynchronous API, compression image
 * @param {Address of picture}} img
 */
function fileUpload(img) {
    var req = https.request(options, function (res) {
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
        res.on('data', function (data) {
            body += data;
        });
        res.on('end', function () {
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


function fileUploadUseKey(input) {
    const req_options = require('url').parse('https://api.tinypng.com/shrink');
    req_options.auth = `api:${optionsKey.api_key}`;
    req_options.method = 'POST';
    const request = https.request(req_options, function (res) {
        res.on('data', function (d) {
            d = JSON.parse(d);
            if (d.error) {
                process.stdout.write(`${'error'.red}\n`);
                exit(1);
            } else {
                console.log(
                    `🍓 Handle a successful: Image compression -${((1 - d.output.ratio) * 100).toFixed(1)}%`
                );
            }
        });

        if (res.statusCode === 201) {
            https.get(res.headers.location, function (res) {
                res.pipe(fs.createWriteStream(input));
            });
        }
    });
    fs.createReadStream(input)
        .pipe(request);
}

/**
 * Statistics of the number
 */
function statisticsTheNumber(filePath, isIteration) {
    var files = fs.readdirSync(filePath);
    files.forEach(function (filename) {
        var filedir = path.join(filePath, filename);
        let stats = fs.statSync(filedir);
        var isFile = stats.isFile();
        var isDir = stats.isDirectory();
        if (isFile && exts.includes(path.extname(filedir))) {
            count += 1;
        }
        if (isIteration && isDir) {
            statisticsTheNumber(filedir, true);
        }
    });
}


/**
 * File traversal method
 */
function fileDisplay(filePath, isUseKey) {
    fs.readdir(filePath, function (err, files) {
        if (err) {
            console.error(chalk.red(err))
        } else {
            files.forEach(function (filename) {
                var filedir = path.join(filePath, filename);
                fs.stat(filedir, function (eror, stats) {
                    if (eror) {
                        console.error(chalk.red("Get file stats failed"))
                    } else {
                        var isFile = stats.isFile();
                        var isDir = stats.isDirectory();
                        if (isFile && exts.includes(path.extname(filedir))) {
                            fileFilter(filedir, isUseKey);
                        }
                        if (isDir) {
                            fileDisplay(filedir, isUseKey);
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
 * Get default options from settings file
 *
 * @returns {*}
 */
function getOptions() {
    const buffer = fs.readFileSync(options_path);
    if (!buffer.toString()) {
        console.error(chalk.red("💥 Please set up the tinypng API,You can get one at https://tinypng.com/developers."))
        process.exit(1)
    }
    optionsKey = JSON.parse(buffer.toString());
    return optionsKey;
}

/**
 * Set option with saving to settings file
 *
 * @param param
 * @param value
 */
function setOption(param, value) {
    if (typeof param !== 'undefined' && typeof value !== 'undefined') {
        setLocalOption(param, value);
        const write_data = JSON.stringify(optionsKey, null, 2);
        fs.writeFileSync(options_path, write_data);
    }
}

/**
 * Set option whithout saving to settings file
 *
 * @param {string} param
 * @param {(string|boolean)} value
 */
function setLocalOption(param, value) {
    if (typeof param !== 'undefined' && typeof value !== 'undefined') {
        optionsKey[param] = value;
    }
}

/**
 * Shows help message
 */
function logHelp() {
    const message = `
Usage: tinypng [options] 
Options:
  -k, --api-key      \tSet default TinyPNG API key.
  -a, --all      \tModify all images under the file.
  -c, --current  \tCurrent level directory
  -p, --part     \tProcessing of specified files,use: tinypng -p  [image.png|*.png|*.jpeg|*.jpg]
  -h, --help         \tThis message.
  -v, --version      \tShow version.
`;

    console.log(message);
}
