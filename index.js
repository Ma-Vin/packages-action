
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const spawn = require('child_process').spawn;


const appName = 'PackagesAction';
const workDirectory = `${__dirname}/${appName.toLowerCase()}work`;

const releaseUrl = 'https://api.github.com/repos/Ma-Vin/packages-action-app/releases/tags/v1.1.1';

const packagesActionLinuxAmd64Hash512 = '59657c8f29c39646f1637afeb7c4d38737d135fab831b692f09e0f227117a25a79c2310a7eadad818dcd128fb7f4aa1902ea46c6706ff3cface63df46d7ff2bc';
const packagesActionLinuxArm64Hash512 = '33985dbb8ad73c46085af080438a3edbb964d1c41bf6b8519f38cbddf71a53643d17ce5c9f903e1a7f118b84a0fe2f0a66867d7a9767fd93bf0a9f128990c569';
const packagesActionWindowsAmd64Hash512 = '35939add1d4b8f7b79d74f45b53283181c3fc68ce0d71c7080c73269a70e2f4af98438942fa9981e858b671a8f9decda937141f8f72ec38a8b94803cc0842b3d';
const packagesActionWindowsArm64Hash512 = '657afea53ffe9dac0421eda3a595b8ef0eaa7e5866aa89331d86fdde41abf2c52c358b2ee4b053e211f0512cc9842b51c22e3176a257ebaaa0768d77fe764368';

const httpOptions = {
    headers: {
        'User-Agent': 'Ma-Vin'
    }
};

const binaryHttpOptions = {
    headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'Ma-Vin'
    },
    encoding: null
};

var plattform;
var arch;
var zipFileName;
var executableFileName;
var hashFileName;


async function determineAndDownloadApp() {
    const assetUrl = await getAssetUrl(zipFileName);

    await downloadApp(assetUrl);
    await unpackApp(zipFileName);
    await verifyHash(hashFileName, executableFileName);
    console.info('hash verrify done');
}


async function getAssetUrl(zipFileName) {
    console.info('determine asset url from release');

    return new Promise(resolve => {
        https.get(releaseUrl, httpOptions, res => {
            if (res.statusCode !== 200) {
                res.resume();
                throw new Error(`request Failed. Status Code ${res.statusCode}`);
            }

            let data = '';

            res.on("data", chunk => {
                data += chunk;
            }).on("end", () => {
                let jsonData = JSON.parse(data);
                for (let assetId in jsonData.assets) {
                    let asset = jsonData.assets[assetId];
                    if (asset.name == zipFileName) {
                        console.info(`determine ${asset.url} for asset ${zipFileName}`)
                        resolve(asset.url);
                        return;
                    }
                }
                resolve('');
                throw new Error(`No asset ${zipFileName} found`);
            });
        });
    });
}


function downloadApp(assetUrl) {
    console.info(`download zip from ${assetUrl}`);
    if (fs.existsSync(workDirectory)) {
        fs.rmSync(workDirectory, { recursive: true, force: true });
    }
    fs.mkdirSync(workDirectory);

    return new Promise(resolve => {
        https.get(assetUrl, binaryHttpOptions, res => {

            if (res.statusCode !== 200 && res.statusCode !== 302) {
                res.resume();
                throw new Error(`request Failed. Status Code: ${statusCode}`);
            }

            if (res.statusCode == 302) {
                console.info('redirected to get asset');
                resolve(downloadApp(res.headers.location));
                return;
            }

            let stream = fs.createWriteStream(`${workDirectory}/${zipFileName}`);

            res.on('data', (chunk) => {
                stream.write(chunk);
            }).on('end', () => {
                stream.end(() => {
                    console.info('download done');
                    resolve();
                });
            });
        });
    });
}

async function unpackApp(zipFileName) {
    console.info(`decompress zip ${zipFileName}`);
    const appExec = spawn(plattform == 'linux' ? 'unzip' : '7z', plattform == 'linux' ? [zipFileName] : ['e', zipFileName], { cwd: workDirectory });

    return new Promise((resolve) => {
        appExec.stdout.on('data', (data) => {
            console.info(`unzip: ${data}`);
        });

        appExec.stderr.on('data', (data) => {
            console.error(`unzip ${data}`);
        });

        appExec.on('close', () => {
            console.info('unpack done');
            resolve();
        });

        appExec.on('error', () => { throw new Error('failed to exectute app') });
        appExec.on('exit', code => { if (code != 0) { throw new Error('failed to exectute app') } else { resolve } })
    });
}

async function verifyHash(hashFileName, executableFileName) {
    console.info('check hash values');
    const expectedHash = getExpectedHash();

    fs.readFile(`${workDirectory}/${hashFileName}`, function (err, data) {
        if (err) { throw err; }
        if (!data.includes(`sha512: ${expectedHash} `)) {
            throw new Error('expected hash value not found');
        }
    });

    const determinedHash = await getHash(`${workDirectory}/${executableFileName}`);
    if (expectedHash != determinedHash) {
        throw new Error(`expected hash value not determined at ${executableFileName}`);
    }
}

function getExpectedHash() {
    if (plattform == 'linux' && arch == 'amd64') {
        return packagesActionLinuxAmd64Hash512;
    }
    if (plattform == 'linux' && arch == 'arm64') {
        return packagesActionLinuxArm64Hash512;
    }
    if (plattform == 'windows' && arch == 'amd64') {
        return packagesActionWindowsAmd64Hash512;
    }
    if (plattform == 'windows' && arch == 'arm64') {
        return packagesActionWindowsArm64Hash512;
    }
    console.error(`unsupported platform ${plattform} and arch ${arch}`);
    return '';
}

const getHash = path => new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha512');
    const rs = fs.createReadStream(path);
    rs.on('error', reject);
    rs.on('data', chunk => hash.update(chunk));
    rs.on('end', () => resolve(hash.digest('hex')));
})


function checkPlattformAndArch() {
    if ((os.platform() != 'linux' && os.platform() != 'win32') || (os.arch() != 'x64' && os.arch() != 'arm64')) {
        throw new Error(`unsupported platform ${os.platform()} and arch ${os.arch()}`);
    }
    arch = os.arch() == 'x64' ? 'amd64' : os.arch();
    plattform = os.platform() == 'win32' ? 'windows' : os.platform();

    zipFileName = `packages-action-${plattform}-${arch}.zip`;
    executableFileName = `packages-action-${plattform}-${arch}${plattform == 'windows' ? '.exe' : ''}`;
    hashFileName = `packages-action-${plattform}-${arch}-hash.txt`;

    console.info(`valid platform ${os.platform()} and arch ${os.arch()}`);
    console.info(`they are mapped to platform ${plattform} and arch ${arch}`);
}

async function executeApp() {
    console.info('start go app')
    const appExec = spawn(`${workDirectory}/${executableFileName}`);

    return new Promise((resolve) => {
        appExec.stdout.on('data', (data) => {
            console.info(`${data}`);
        });

        appExec.stderr.on('data', (data) => {
            console.error(`${data}`);
        });

        appExec.on('close', resolve)

        appExec.on('error', () => { throw new Error('failed to exectute app') })
        appExec.on('exit', code => { if (code != 0) { throw new Error('failed to exectute app') } else { resolve } })
    });
}


async function main() {
    try {
        console.info(`start ${appName}`);
        console.info(`working at directory ${__dirname}`);
        checkPlattformAndArch();
        await determineAndDownloadApp();
        await executeApp();
        console.info(`end ${appName}`);

        process.exit();
    } catch (error) {
        console.error(`failed to execute ${appName}:`);
        console.error(error.message);

        process.exit(1);
    }
}

main();