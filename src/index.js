const path = require('path')
const fs = require('fs')
const axios = require('axios')
const async = require('async')
const chalk = require('chalk')

const utils = require('./utils')

require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env')
})

const baseURL = 'https://tv.eslpod.com'
const indexURL = '/'
const outputDirectory = path.resolve(__dirname, '..', 'output')

// check output directory
try {
  if (!fs.lstatSync(outputDirectory).isDirectory()) {
    console.error(chalk.red('output directory path is not a directory'))
    process.exit(1)
  }
} catch (exception) {
  console.error(chalk.red('output directory does not exist or permission denied'))
  process.exit(1)
}

const xhrInstance = axios.create({
  baseURL,
  timeout: 30e3,
  headers: { 'User-Agent': process.env.USER_AGENT, 'Cookie': process.env.COOKIE }
})

// let's roll
xhrInstance.get(indexURL)
  .then(({ data }) => {
    console.log(chalk.gray(`--> GET ${indexURL}`))
    return utils.retrieveLectureGroupURLs(data)
  })
  .then(urls => {
    return new Promise((resolve, reject) => {
      async.mapSeries(urls, (url, callback) => {
        xhrInstance.get(url)
          .then(({ data }) => {
            console.log(chalk.gray(`--> GET ${url}`))
            callback(null, utils.retrieveLectureURLs(data))
          })
          .catch(error => {
            callback(error)
          })
      }, (err, results) => {
        if (err) {
          reject(err)
        }
        resolve(results)
      })
    })
      .then(urls => {
        let n = []
        n = n.concat.apply(n, urls)
        // n.splice(0, 1305)
        return n
      })
  })
  .then(urls => {
    return new Promise((resolve, reject) => {
      async.mapSeries(urls, (url, callback) => {
        xhrInstance.get(url)
          .then(({ data }) => {
            console.log(chalk.gray(`--> GET ${url}`))
            return utils.retrieveLecture(data)
          })
          .then(({ name, audioURL, text }) => {
            name = name.replace(/&amp;/g, '\&')
            name = name.replace(/&quot;/g, '\"')
            name = name.replace(/\x20{2,}/g, '\x20')
            name = name.replace(/\//g, '\uff0f')
            name = name.replace(/\\/g, '\uff3c')
            name = name.replace(/\x20*\:\x20*/g, '\uff1a')
            name = name.replace(/\*/g, '\uff0a')
            name = name.replace(/\?/g, '\uff1f')
            name = name.replace(/\</g, '\uff1c')
            name = name.replace(/\>/g, '\uff1e')
            name = name.replace(/\|/g, '\uff5c')
            name = name.replace(/\"/g, '\uff02')
            name = name.replace(/\'/g, '\uff07')
            return Promise.all([
              utils.saveLectureText({
                path: path.resolve(outputDirectory, `${name}.html`),
                text
              })
                .then(() => {
                  console.log(chalk.green(`[${name}] text saved.`))
                }),
              utils.saveLectureAudio({
                path: path.resolve(outputDirectory, `${name}.mp3`),
                audioURL
              })
                .then(() => {
                  console.log(chalk.green(`[${name}] audio saved.`))
                }),
            ])
          })
          .then(() => {
            callback(null)
          })
          .catch(error => {
            callback(error)
          })
      }, (err, results) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  })
  .catch(error => {
    console.error(chalk.red('Error:', error))
  })
