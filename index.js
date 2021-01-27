'use strict';
const NodeID3 = require('node-id3');
const jschardet = require("jschardet");
const Iconv = require('iconv');

const fs = require("fs");
const path = require("path");

const minimist = require('minimist');
const { setMaxListeners } = require('process');

function main() {
  new CorrectTagsCli();
}

class CorrectTagsCli {
  constructor(params) {
    console.log("hi, lets start")
    this.args = minimist(process.argv.slice(2), {
      alias: {
        h: "help",
        p: "path",
        c: "command",
      },
    });
    if (this.args.help != null) {
      this.help();
      return;
    }
    if (!this.checks()) {
      return;
    }
    switch (this.args.command) {
      case "getList":
        new CorrectTags({ initPath: this.args.path }).getList();
        break;
      case "setList":
        new CorrectTags().setList();
        break;
      default:
        console.log("we need command arg -c, see help");
        break;
    }
  }
  help() {
    console.log("hi, i am help:");
    console.log("  we need args:");
    console.log("    -h help");
    console.log("    -p path to music folder");
    console.log("    -c command");
    console.log("  list commands:");
    console.log("    auto - automatic change encoding");
    console.log("    getList - create json file - list media whith tags");
    console.log("      you can edit this file");
    console.log("    setList - I take json file - list media whith edited tags");
  }
  checks() {
    if (this.args.command == "getList") {
      if (this.args.path == null ||
        !(typeof (this.args.path) == "string") ||
        this.args.path == "") {
        console.log("we need path to music folder at -p argument");
        return (false);
      }
      if (!fs.existsSync(this.args.path)) {
        console.log(`there no such path ${this.args.path}`);
        return (false);
      }
    }
    if (this.args.command == "setList") { }
    return (true);
  }
}

class CorrectTags {
  constructor(params) {
    this.initPath = params?.initPath;
    this.fileTagList = "tagEditorTMP.json";
  }

  getList() {
    var lst = new GetFiles().run(this.initPath)
      .filter(function (item, i, arr) {
        return (item.includes(".mp3"));
      }.bind(this));
    console.log(`we found ${lst.length} tracks`)
    var lstToSave = [];
    lst.forEach(function (item, i, arr) {
      const tags = NodeID3.read(item);
      lstToSave.push({ path: item, tags: tags })
    }.bind(this));
    //var resultFilePath = path.join(this.initPath, "tagEditorTMP.js");
    var resultFilePath = this.fileTagList;
    if (fs.existsSync(resultFilePath)) {
      fs.unlinkSync(resultFilePath);
    }
    fs.writeFile(
      resultFilePath, JSON.stringify({ lst: lstToSave }, null, 2),
      function (err) {
        if (err) return console.log(err);
      }
    );
    console.log(`You can take file at ${resultFilePath}`)
  }
  setList() {
    console.log("setting list");
    var data = JSON.parse(fs.readFileSync(this.fileTagList));
    data.lst.forEach(function (item, i, arr) {
      this.writeTags({ tags: item.tags, filePath: item.path });
    }.bind(this));
    console.log(`edited ${data.lst.length}`);
  }

  auto() {
    console.clear();
    console.log("getting files");
    var lst = new GetFiles().run(this.initPath);
    console.log(`got ${lst.length}`);

    var lst = lst
      .filter(function (item, i, arr) {
        return (item.includes(".mp3"));
      }.bind(this));

    console.log(`${lst.length} mp3 filtered`);

    //console.log(lst[0]);

    lst
      .forEach(function (item, i, arr) {
        console.clear();
        console.log(`current index:${i} of ${arr.length}, current path ${item}`);
        this.processFile(item);
      }.bind(this));

    console.log(`${lst.length} mp3 done`);

  }

  processFile(filePath) {
    const tags = NodeID3.read(filePath);
    //console.log(jschardet.detect(tags.title));
    var needEdit = false;
    if (tags.title == "" || tags.title == null) {
      tags.title = path.basename(filePath);
      needEdit = true;
    }

    try {
      Object.keys(tags).forEach(function (tagName, i, arr) {

        if (typeof tags[tagName] == "string") {
          var enc = jschardet.detect(tags[tagName]).encoding;
          if (enc != "ascii") {
            //tags[tagName] = conv.convert(buf).toString();
            var conv = Iconv.Iconv("WINDOWS-1251", 'utf8');
            var buf = Buffer.from(tags[tagName], 'binary');
            tags[tagName] = conv.convert(buf).toString();
            needEdit = true;
          }
        }

      }.bind(this));
      if (needEdit) { this.writeTags(tags, filePath); }

    } catch (e) { console.log(e); }
  }

  writeTags(params) {
    //const success = NodeID3.write(params.tags, params.filePath) // Returns true/Error
    const success = NodeID3.update(params.tags, params.filePath) //  Returns true/Error
  }

  test1() {
    console.clear();
    fs.readFile('test.txt', 'utf8', function (err, data) {
      console.log("asd");
      if (err) {
        return console.log(err);
      }
      var enc = jschardet.detect(data);
      console.log(enc);

      console.log(data);
    });
  }

  test2() {
    var asd = fs.readdirSync(this.initPath);
  }
}

class GetFiles {
  constructor(dirPath) {

    this.getAllFiles = function (dirPath, arrayOfFiles) {
      this.files = fs.readdirSync(dirPath)

      arrayOfFiles = arrayOfFiles || []

      this.files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
          arrayOfFiles = this.getAllFiles(dirPath + "/" + file, arrayOfFiles)
        } else {
          arrayOfFiles.push(path.join(dirPath, "/", file))
        }
      }.bind(this))

      return arrayOfFiles
    }

  }
  run(dirPath) {
    return this.getAllFiles(dirPath);
  }
}

//todo:
//return list
//get list
//edit one hands
//edit one auto
//set special encoding
//help
//gui
//  select encoding from list
//wui
//remove excess libs

main();
