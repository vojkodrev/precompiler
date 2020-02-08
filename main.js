const Glob = require("glob").Glob
const util = require("util")
const fs = require("fs")
const readFilePromisify = util.promisify(fs.readFile)
const writeFilePromisify = util.promisify(fs.writeFile)
const Handlebars = require("handlebars")
const path = require("path")
const detectIndent = require('detect-indent');

async function processPre(preFile, dir) {
  let preTemplate = path.join(dir, preFile["pre-template"])
  preTemplate = await readFilePromisify(preTemplate)
  preTemplate = preTemplate.toString("utf-8")

  let indent = detectIndent(preTemplate).indent

  preTemplate = Handlebars.compile(preTemplate)

  let templateData = {}

  for (let key of Object.keys(preFile).filter(key => key != "pre-template")) {
    let value = preFile[key]

    if (typeof value == "object") {
      if (value["pre-template"]) {
        templateData[key] = await processPre(value, dir)
      } else {
        templateData[key] = JSON.stringify(value)
      }
    } else {
      templateData[key] = value
    }
  }

  preTemplate = preTemplate(templateData)
  preTemplate = JSON.stringify(JSON.parse(preTemplate), null, indent)

  return preTemplate
}

async function processPreFile(preFile) {

  console.log("pre", preFile)

  let dir = path.dirname(preFile)
  let dstFile = path.join(dir, path.basename(preFile, ".pre"))

  preFile = await readFilePromisify(preFile)
  preFile = JSON.parse(preFile)

  let preTemplate = await processPre(preFile, dir)

  await writeFilePromisify(dstFile, preTemplate)
}

let globPattern = `${process.argv[2] || process.cwd()}/**/*.pre`

let glob = new Glob(globPattern)
glob.on("match", processPreFile)
glob.on("error", console.error) 
