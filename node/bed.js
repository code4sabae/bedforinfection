const cheerio = require('cheerio')
const util = require('./util.js')
const fetch = require('node-fetch')
const fs = require('fs')
const iconv = require('iconv-lite')

const PREF = util.JAPAN_PREF
const PREF_EN = util.JAPAN_PREF_EN

const PATH = 'data/bed/'

const filterElement = function(s) {
  s = s.trim()
  return s
  /*
  let s2 = util.toHalfNumber(s)
  s2 = s2.replace(/\,/g, "")
  const p = s2.match(/(\d+)床/)
  if (!p)
    return s
  return parseInt(p[1])
  */
}
const parseArrayFromTable = function(dom, tbl) {
  const res = []
  let flgwithlink = false
  dom('tr', '', tbl).each((idx, ele) => {
    const line = []
    let link = null
    const pushLine = function(idx, ele) {
      let href = dom('a', '', ele).attr('href')
      if (href && href.length > 0)
        link = href.trim()
      line.push(filterElement(dom(ele).text()))
    }
    dom('th', '', ele).each(pushLine)
    dom('td', '', ele).each(pushLine)
    if (link) {
      line.push(link)
      flgwithlink = true
    }
    res.push(line)
  })
  if (flgwithlink) {
    res[0].push('URL')
  }
  return res
}
const parse = function(data) {
  const dom = cheerio.load(data)
  let res = null
  dom('table').each((idx, ele) => {
    console.log(ele)
    res = parseArrayFromTable(dom, ele)
  })
  return res
}
const getHospital = async function(pref) {
  const npref = util.JAPAN_PREF.indexOf(pref) + 1
  if (npref == 0)
    return null
  const url = `http://www.hospital.or.jp/shibu_kaiin/?sw=${npref}&sk=1`
  const data = await (await fetch(url)).text()
  console.log(data)
  const csv = parse(data)
  console.log(csv)
  return csv
}
const makeHospitalData = async function() {
  const PREF = util.JAPAN_PREF
  const res = []
  res.push([ 'URL', '都道府県', '経営主体', '病院名', '病床数', '住所', '電話' ])
  for (let j = 0; j < PREF.length; j++) {
    const spref = PREF[j]
    const pref = await getHospital(spref)
    for (let i = 1; i < pref.length; i++) {
      const l = pref[i]
      res.push([ l[5], spref, l[0], l[1], l[2], spref + l[3], l[4] ])
    }
  }
  console.log(res)
  util.writeCSV('hospitals-japan-org', res)
}
const makeCSVwithoutLink = function() {
  const csv = util.readCSV('hospitals-japan-org')
  const res = []
  res.push(csv[0])
  for (let i = 1; i < csv.length; i++) {
    const line = csv[i]
    const link = line[0]
    if (link.length == 0) {
      res.push(line)
    }
  }
  util.writeCSV('hospitals-japan-nolink', res)
  console.log(csv.length - 1, res.length - 1)
}
const makeMargedCSV = function() {
  const csvdif = util.readCSV('hospitals-japan-nolink-2')
  const csv = util.readCSV('hospitals-japan-org')
  for (let i = 1; i < csv.length; i++) {
    const line = csv[i]
    if (line[0].length == 0) {
      for (let j = 1; j < csvdif.length; j++) {
        const linedif = csvdif[j]
        if (line[3] == linedif[3]) {
          if (linedif[0].length == 0) {
            csv.splice(i, 1)
            i--
          } else {
            line[0] = linedif[0]
          }
          break
        }
      }
    }
  }
  util.writeCSV('hospitals-japan', csv)
}
const makeBedForInfectionCSV = function() {
  //const data = util.readCSV('bedforinfection')
  //util.writeCSV('bedforinfection')
}
const main = async function() {
  // await makeHospitalData()
  // makeCSVwithoutLink() // edit csv
  // makeMargedCSV()
  makeBedForInfectionCSV()
}
if (require.main === module) {
  main()
} else {
  startUpdate()
}
