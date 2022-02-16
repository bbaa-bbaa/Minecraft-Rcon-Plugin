const { deepStrictEqual } = require("assert");
const crypto = require("crypto");
const uuid = require("uuid").stringify;
class BasePlugin {
  constructor(Core) {
    this.Core = Core;
    const hash = crypto.createHash("sha1");
    this.Scoreboard_Prefix = hash.update(this.constructor.name).digest("hex");
  }
  ConvertUUID(_IntArray) {
    const arr = new ArrayBuffer(16);
    const view = new DataView(arr);
    //let  _IntArray = [-1632430930, -1307881510, -1319685969, 644903231]
    for (let [i, item] of _IntArray.entries()) {
      view.setInt32(i * 4, item, false);
    }
    return uuid(new Uint8Array(arr));
  }
  async getUUID(Player) {
    return this.ConvertUUID(
      await this.CommandSender(
        this.newVersion
          ? `data get entity @e[limit=1,name="${Player}"] UUID`
          : "; 0,0,0,0"
      )
        .then(a => {
          return a
            .split(";")[1]
            .replace(/\]/g, "")
            .split(",")
            .map(b => Number(b.trim()));
        })
        .catch(b => [0, 0, 0, 0])
    );
  }
  CommandSender() {
    return this.Core.RconClient.send(...arguments).catch(
      this.Core.ErrorHandle.bind(this.Core)
    );
  }
  async tellraw(Dest, Json) {
    if (this.newVersion && !/@/.test(Dest)) {
      Dest = `@e[name="${Dest}",type=minecraft:player]`;
    }
    let startWith = `tellraw ${Dest} `;
    let newJson = [[]];
    for (let Item of Json) {
      if (/^\n/.test(Item.text) && /\n$/.test(Item.text)) {
        Item.text = Item.text.toString().replace(/^\n/, "");
        newJson.push([Item]);
      } else if (/\n$/.test(Item.text)) {
        Item.text = Item.text.toString().replace(/\n$/, "");
        newJson[newJson.length - 1].push(Item);
        newJson.push([]);
      } else if (/^\n/.test(Item.text)) {
        Item.text = Item.text.toString().replace(/^\n/, "");
        newJson.push([Item]);
      } else if(Item instanceof Array) {
        for(let it of Item) {
          if (/^\n/.test(it.text) && /\n$/.test(it.text)) {
            it.text = it.text.toString().replace(/^\n/, "");
            newJson.push([it]);
          } else if (/\n$/.test(it.text)) {
            it.text = it.text.toString().replace(/\n$/, "");
            newJson[newJson.length - 1].push(it);
            newJson.push([]);
          } else if (/^\n/.test(it.text)) {
            it.text = it.text.toString().replace(/^\n/, "");
            newJson.push([it]);
          } else {
            it.text = it.text.toString();
            newJson[newJson.length - 1].push(it);
          }
        }
      } else {
        Item.text = Item.text.toString();
        newJson[newJson.length - 1].push(Item);
      }
    }
    for (let msg of newJson) {
      await this.CommandSender(startWith + JSON.stringify(msg));
    }
  }
  async getAllScore() {
    let Score = this.Core.PluginInterfaces.get("Scoreboard").Scores;
    let NewScore = {};
    for (let [Player, ScoreList] of Object.entries(Score)) {
      NewScore[Player] = {};
      for (let [ScoreName, Score] of Object.entries(ScoreList)) {
        if (ScoreName.substr(0, 4) == this.Scoreboard_Prefix.substr(0, 4)) {
          NewScore[Player][ScoreName.substr(5)] = Score;
        }
      }
    }
    return NewScore;
  }
  async updateScore() {
    return this.Core.Scoreboard.updateScore(this);
  }
  async getScoreByPlayer(Player) {
    return (await this.getAllScore())[Player];
  }
  async getScoreByName(Name) {
    let Score = await this.getAllScore();
    let NewScore = {};
    for (let [Player, ScoreList] of Object.entries(Score)) {
      for (let [ScoreName, Score] of Object.entries(ScoreList)) {
        console;
        if (ScoreName == Name) {
          NewScore[Player] = Score;
        }
      }
    }
    return NewScore;
  }
  get Scoreboard() {
    let Mapping = {};
    for (let [name, Func] of Object.entries(this.Core.Scoreboard)) {
      Mapping[name] = (...arg) => {
        return Func(...arg, this);
      };
    }
    return Mapping;
  }
  get newVersion() {
    return this.Core.options.newVersion || false;
  }
}
module.exports = BasePlugin;
