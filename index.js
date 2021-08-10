const gets = require('./src/Gets');
const sets = require('./src/Sets');
const main = require('./src/Main')

let conexionMYSQL;

const conexion = (db) => {
    conexionMYSQL = db;
    db.query(`CREATE TABLE IF NOT EXISTS levels (
        id VARCHAR (25) NOT NULL,
        idKey VARCHAR (25) NOT NULL,
        xp INT,
        lvl INT
    );`)
}

module.exports = {
    conexion,
    main: {
        options: ({limitXP, maxXP}) => {
            return main.opcion(conexionMYSQL, limitXP, maxXP)
        },
        newLevel: (id, key) => {
            return main.newLevel(conexionMYSQL, id, key)
        }
    },
    get: {
        Level: (id, key) => {
            return gets.getLevel(conexionMYSQL, id, key);
        },
        XP: (id, key) => {
            return gets.getXP(conexionMYSQL, id, key);
        },
        TOP: (key, limit) => {
            return gets.getTop(conexionMYSQL, key, limit);
        }
    },
    set: {
        Level: (id, key, lvl) => {
            return sets.setLevel(conexionMYSQL, id, key, lvl);
        },
        XP: (id, key, xp) => {
            return sets.setXP(conexionMYSQL, id, key, xp);
        }
    },
    delete: {
        user: (id, key) => {
            return new Promise((resolve, reject) => {
                conexionMYSQL.query(`DELETE FROM levels WHERE id = ? AND idKey = ?`, [id, key], (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            })
        },
        all: () => {
            return new Promise((resolve, reject) => {
                conexionMYSQL.query('DROP TABLE levels;', (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            })
        }
    }
}