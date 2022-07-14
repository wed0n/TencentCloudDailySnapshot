const crypto = require('crypto');
const https = require('node:https');

//密钥参数
const SECRET_ID = process.env.SECRET_ID
const SECRET_KEY = process.env.SECRET_KEY
//轻量云服务器实例ID
const INSTANCE_ID = process.env.INSTANCE_ID

function sha256(message, secret = '', encoding) {
    const hmac = crypto.createHmac('sha256', secret)
    return hmac.update(message).digest(encoding)
}

function getHash(message, encoding = 'hex') {
    const hash = crypto.createHash('sha256')
    return hash.update(message).digest(encoding)
}

function getDate(timestamp) {
    const date = new Date(timestamp * 1000)
    const year = date.getUTCFullYear()
    const month = ('0' + (date.getUTCMonth() + 1)).slice(-2)
    const day = ('0' + date.getUTCDate()).slice(-2)
    return `${year}-${month}-${day}`
}

//action是待执行的动作,payload是POST请求体
async function calculate(action, payload) {
    const endpoint = "lighthouse.tencentcloudapi.com"
    const service = "lighthouse"
    const region = "ap-shanghai"
    const version = "2020-03-24"
    const timestamp = (Date.now() / 1000) | 0;
    //时间处理, 获取世界时间日期
    const date = getDate(timestamp)

    // ************* 步骤 1：拼接规范请求串 *************
    const signedHeaders = "content-type;host"
    const hashedRequestPayload = getHash(payload);
    const httpRequestMethod = "POST"
    const canonicalUri = "/"
    const canonicalQueryString = ""
    const canonicalHeaders = "content-type:application/json; charset=utf-8\n" + "host:" + endpoint + "\n"

    const canonicalRequest = httpRequestMethod + "\n"
        + canonicalUri + "\n"
        + canonicalQueryString + "\n"
        + canonicalHeaders + "\n"
        + signedHeaders + "\n"
        + hashedRequestPayload

    // ************* 步骤 2：拼接待签名字符串 *************
    const algorithm = "TC3-HMAC-SHA256"
    const hashedCanonicalRequest = getHash(canonicalRequest);
    const credentialScope = date + "/" + service + "/" + "tc3_request"
    const stringToSign = algorithm + "\n" +
        timestamp + "\n" +
        credentialScope + "\n" +
        hashedCanonicalRequest

    // ************* 步骤 3：计算签名 *************
    const kDate = sha256(date, 'TC3' + SECRET_KEY)
    const kService = sha256(service, kDate)
    const kSigning = sha256('tc3_request', kService)
    const signature = sha256(stringToSign, kSigning, 'hex')

    // ************* 步骤 4：拼接 Authorization *************
    const authorization = algorithm + " " +
        "Credential=" + SECRET_ID + "/" + credentialScope + ", " +
        "SignedHeaders=" + signedHeaders + ", " +
        "Signature=" + signature

    //发送请求
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'lighthouse.tencentcloudapi.com',
            method: 'POST',
            headers: {
                'Authorization': authorization,
                'Content-Type': 'application/json; charset=utf-8',
                'X-TC-Action': action,
                'X-TC-Timestamp': timestamp.toString(),
                'X-TC-Version': version,
                'X-TC-Region': region
            },
        }

        const req = https.request(options, (res) => {
            res.on('data', (d) => {
                let body = '' + d
                resolve(JSON.parse(body))
            })
        })

        req.write(payload)//写入POST请求体
        req.on('error', (e) => {
            console.error(e)
            reject()
        })
        req.end()
    })
}

async function main() {
    const regPattern = /每日快照/m
    //列出快照
    const listSnapshots = await calculate("DescribeSnapshots", '')

    //删除快照
    const myset = listSnapshots.Response.SnapshotSet
    let delId = []
    for (i = 0; i < myset.length; i++) {
        if (regPattern.exec(myset[i].SnapshotName)) {
            delId.push(myset[i].SnapshotId)
            break
        }
    }
    postBody = {
        "SnapshotIds": delId
    }
    await calculate("DeleteSnapshots", JSON.stringify(postBody))

    //创建实例快照
    const snapshotName = '每日快照' + ' ' + getDate((Date.now() / 1000) | 0 + 28800) //UTC+8
    postBody = {
        'InstanceId': INSTANCE_ID,
        'SnapshotName': snapshotName
    }
    await calculate("CreateInstanceSnapshot", JSON.stringify(postBody))
    console.log("脚本执行完毕")
}

main()