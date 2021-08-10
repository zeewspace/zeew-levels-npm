module.exports = {
    getLevel: (conexion, id, key) => {
        return new Promise((resolve, reject) => {
            conexion.query('SELECT * FROM `levels` WHERE `id` = ? AND `idKey` = ? ', [id,key], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if(rows.length === 0) resolve(false)
                    else resolve(rows[0].lvl);
                }
            });
        })
    },
    getXP: (conexion, id, key) => {
        return new Promise((resolve, reject) => {
            conexion.query('SELECT * FROM `levels` WHERE `id` = ? AND `idKey` = ? ', [id,key], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if(rows.length === 0) resolve(false)
                    else resolve(rows[0].xp);
                }
            });
        })
    },
    getTop: (conexion, key, limit) => {
        return new Promise((resolve, reject) => {
            conexion.query(`SELECT * FROM levels WHERE idkey= '${key}' ORDER BY lvl DESC, xp DESC  LIMIT ${limit}`, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    if(rows.length === 0) resolve(false)
                    else resolve(rows);
                }
            });
        })
    },
}