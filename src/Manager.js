/**
 * @author kamerrez / http://kamerrez.com
 * @copyright 2022
 */

const deepmerge = require("deepmerge");
const db = require("quick.db");

const {
  ZeewData,
  ZeewLevelOptions,
  ZeewLevelOptionsDefault,
} = require("./Constant");

class ZeewLevel {
  /**
   * @param {ZeewLevelOptions} options - Las opciones para el nivel
   */
  constructor(options) {
    this.options = deepmerge(ZeewLevelOptionsDefault, options || {});
    this.cache = new Set();
    this.isGlobal = "zeewlevel";

    setInterval(() => {
      this.cache.clear();
    }, this.options.cooldown.deleteCache);
  }

  /**
   * @param {String} key - La clave para identificar donde esta el usuario
   * @returns {Promise<ZeewData[]>}
   */
  getAllLvl(key) {
    return new Promise(async (resolve, reject) => {
      let getKey = this.options.isGlobal ? this.isGlobal : key;
      let getData = await db
        .all()
        .filter((i) => i.ID.startsWith(getKey))
        .map((res) => ({
          id: res.data.id,
          level: res.data.level,
          xp: res.data.xp,
          key: res.data.key,
        }));
      resolve(getData);
    });
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   * @returns {Promise<ZeewData>}
   */
  getData(key, id) {
    return new Promise(async (resolve, reject) => {
      let getKey = this.options.isGlobal ? this.isGlobal : key;

      let getData = db.get(`${getKey}-${id}`);
      if (!getData) return resolve(false);
      resolve(getData);
    });
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   * @param {Number} lvl - El nivel del usuario
   */
  saveLevel(key, id, lvl) {
    let getKey = this.options.isGlobal ? this.isGlobal : key;
    db.set(`${getKey}-${id}.level`, lvl);
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   * @param {Number} xp - La experiencia del usuario
   */
  async saveXP(key, id, xp) {
    let getKey = this.options.isGlobal ? this.isGlobal : key;
    db.set(`${getKey}-${id}.xp`, xp);
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   */
  async saveCreatedLevel(key, id) {
    let getKey = this.options.isGlobal ? this.isGlobal : key;
    db.set(`${getKey}-${id}`, { key, id, level: 1, xp: 10 });
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   */
  deleteUser(key, id) {}

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   */
  deleteAll(key) {}

  async leaderboard(key, limit = 10) {
    let getAll = await this.getAllLvl(key);
    let sort = getAll
      .sort((a, b) => b.level - a.level || b.xp - a.xp);
    let top = [];
    for (let i = 0; i < limit; i++) {
      if (!sort[i]) break;
      top.push(sort[i]);
    }
    return top;
  }

  /**
   *
   * @param {String} key - La clave para identificar donde esta el usuario
   * @param {String} id - El id del usuario
   */
  async farmear(key, id) {
    let getKey = this.options.isGlobal ? this.isGlobal : key;
    if (this.cache.has(id)) {
      return;
    }

    this.cache.add(id);
    setTimeout(() => {
      this.cache.delete(id);
    }, this.options.cooldown.timeFarmer);

    let getData = await this.getData(getKey, id);
    if (!getData) this.saveCreatedLevel(getKey, id);

    let addXP = Math.floor(Math.random() * 11) + 15;
    let xp = getData.xp + addXP;
    this.saveXP(key, id, xp);

    let xpToNewLevel = 5 * getData.level ** 2 + 50 * getData.level + 100;

    if (xp >= xpToNewLevel) {
      this.saveLevel(key, id, getData.level + 1);
      this.saveXP(key, id, xp);
      return { newLevel: true, level: getData.level + 1, xp: xp };
    }
  }
}

module.exports = ZeewLevel;
