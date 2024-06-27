
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const spawn = require('child_process').spawn;


const appName = 'PackagesAction';
const workDirectory = `${__dirname}/${appName.toLowerCase()}work`;

const releaseUrl = 'https://api.github.com/repos/Ma-Vin/packages-action-app/releases/tags/v1.0';

const packagesActionLinuxAmd64Hash512 = 'db412e6353e3fb963da7418b0f05c75d13e16c519a3dd479eb573ead48e02dee9e43efb4bfd23678c486a0940311372b55a4edb9f1df94753073d34d894f19a4';
const packagesActionLinuxArm64Hash512 = '39e7e45b66c708b2a9ff49dd2ac6e255d0cf8e0a52fcc81286e1a8b9ee44bc2cce4f258f752aa68888525656bac10fe16ff3cb33b8c77ce5f555cee9e5040ca8';
const packagesActionWindowsAmd64Hash512 = '7f17d7d622117182b266b9bf5d1f98973f67e0a890fccad567a6a85e166f9b282c978f6ab1b6f776a453a0552345929fae24c765fb3f725ec20dad32688c3988';
const packagesActionWindowsArm64Hash512 = '9bc43ea26c21fc69665d98d60bcd6287205893116251a9ce93f35bcb73016dd6a99b140bd967481de4055bb1cb8cc432b7c9a87a4a9a8e54cd9082a1423c80ac';

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
        })
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
    executableFileName = `packages-action-${plattform}-${arch}${plattform == 'windows' ? '.exec' : ''}`;
    hashFileName = `packages-action-${plattform}-${arch}-hash.txt`;

    console.info(`valid platform ${os.platform()} and arch ${os.arch()}`);
    console.info(`they are mapped to platform ${plattform} and arch ${arch}`);
}

async function executeApp() {
    console.info('start go app')
    const appExec = spawn(`${workDirectory}/${executableFileName}`);

    return new Promise((resolve) => {
        appExec.stdout.on('data', (data) => {
            console.info(`app: ${data}`);
        });

        appExec.stderr.on('data', (data) => {
            console.error(`app: ${data}`);
        });

        appExec.on('close', resolve)
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