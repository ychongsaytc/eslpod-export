const fs = require('fs')
const http = require('http')
const https = require('https')
const htmlparser = require('htmlparser2')

/**
 * retrieve lecture group link urls from index page
 *
 * @param {String} data HTML
 */
const retrieveLectureGroupURLs = data => {
  const items = []
  const parser = new htmlparser.Parser({
    onopentag(name, attributes) {
      if (name === 'a' && attributes['data-role'] === 'course-box-link') {
        items.push(attributes['href'])
      }
    }
  })
  parser.parseComplete(data)
  return items
}

/**
 * retrieve lecture link urls from lecture group page
 *
 * @param {String} data HTML
 */
const retrieveLectureURLs = data => {
  const items = []
  const parser = new htmlparser.Parser({
    onopentag(name, attributes) {
      if (name === 'a' && attributes['class'] === 'item') {
        items.push(attributes['href'])
      }
    }
  })
  parser.parseComplete(data)
  return items
}

/**
 * retrieve lecture data from lecture page
 *
 * @param {String} data HTML
 */
const retrieveLecture = data => {
  let name = null
  let audioURL = null
  let text = null
  // retrieve name
  var re = new RegExp('<meta property="og:title" content="([^"]+)" />', 'ig')
  var matches = re.exec(data)
  if (matches) {
    name = matches[1]
  }
  // retrieve audio url
  var re = new RegExp('data-audioloader-url="([^"]+)"', 'ig')
  var matches = re.exec(data)
  if (matches) {
    audioURL = matches[1]
  }
  // retrieve text
  var re = new RegExp('<div class="lecture-text-container">\\n([\\S\\s]+?)\\n</div>', 'ig')
  var matches = re.exec(data)
  if (matches) {
    text = matches[1]
  }
  return { name, audioURL, text }
}

/**
 * save lecture text content to file
 *
 * @param {String} params.path file path
 * @param {String} params.text text content of the lecture
 */
const saveLectureText = ({ path, text }) => {
  return new Promise((resolve, reject) => {
    fs.open(path, 'w+', 0644, (err, fd) => {
      if (err) {
        reject(err)
        return
      }
      fs.write(fd, text, (err, written, buffer) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  })
}

/**
 * save lecture audio to file
 *
 * @param {String} params.path file path
 * @param {String} params.audioURL audio file URL of the lecture
 */
const saveLectureAudio = ({ path, audioURL }) => {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(path, {
      flags: 'w+',
      mode: 0644
    })
    stream.on('close', () => {
      resolve()
      return
    })
    stream.on('error', err => {
      reject(err)
      return
    })
    const request = (audioURL.indexOf('https://') === 0
      ? https
      : http
    ).get(audioURL, res => {
      res.pipe(stream)
    })
    request.on('error', err => {
      reject(err)
      return
    })
  })
}

module.exports = {
  retrieveLectureGroupURLs,
  retrieveLectureURLs,
  retrieveLecture,
  saveLectureText,
  saveLectureAudio
}
