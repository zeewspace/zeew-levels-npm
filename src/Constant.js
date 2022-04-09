/**
 * Objecto de los datos del sistema
 * @typedef ZeewData
 *
 * @property {string} key - La clave para identificar donde esta el usuario
 * @property {string} id - El id del usuario
 * @property {number} level - El nivel del usuario
 * @property {number} xp - La experiencia del usuario
 */
exports.ZeewData = {};

/**
 * @typedef ZeewLevelOptionsCooldwon
 *
 * @property {number} deleteCache - Si se debe eliminar el cache
 * @property {number} timeFarmer - Si el cooldown es global
 */

/**
 *
 * @typedef ZeewLevelOptions
 *
 * @property {boolean} isGlobal - Si es global o no
 * @property {boolean} isXpUp - Si la experiencia aumenta por nivel (true) o no (false)
 * @property {ZeewLevelOptionsCooldwon} cooldown - El tiempo en milisegundos que se espera
 * @property {String} db - El nombre de la base de datos
 *
 */
exports.ZeewLevelOptions = {};

exports.ZeewLevelOptionsDefault = {
  db: './zeewlevel.json',
  isGlobal: false,
  isXpUp: true,
  cooldown: {
    deleteCache: 1000 * 60 * 60 * 24 * 7,
    timeFarmer: 30000,
  },
};
