const news = require('./Main');

const find = (db, id, key) => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT * FROM levels WHERE id = ${id} AND idKey = ${key}`, (err, results) => {
            if(err) {
                reject(err);
            } else {
                if(results.length === 0) resolve(false)
                resolve(results);
            }
        })
    })
}

module.exports = {
    setLevel: async (conexion, id, key, lvl) => {
        const getUser = await find(conexion, id, key);
        if (getUser) {
            conexion.query(`UPDATE Levels SET lvl = '${lvl}' WHERE id = '${id}' AND idKey = '${key}'`, (error) => {
                if (error) throw new Error(error);
            })
            return lvl
        } else {
            news(conexion, id, key, getUser ? getUser.xp : 0, lvl)
            return lvl;
        }
    },
    setXP: async (conexion, id, key, xp) => {
        const getUser = await find(conexion, id, key);
        if (getUser) {
            conexion.query(`UPDATE Levels SET xp = '${xp}' WHERE id = '${id}' AND idKey = '${key}'`, (error) => {
                if (error) throw new Error(error);
            })
            return xp
        } else {
            news(conexion, id, key, xp, getUser ? getUser.lvl : 0);
            return xp;
        }
    }
}