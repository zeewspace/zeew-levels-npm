const gets = require('./Gets');
module.exports = async (conexion, id, key, xp, lvl) => {
    conexion.query('INSERT INTO levels (id, idKey, xp, lvl) VALUES (?, ?, ?, ?)', [id, key, xp, lvl], (err, res) => {
        if (err) return console.log(err);
        console.log('User: ' + id + ' from ' + key + ' created');
    })
}


let limit;
let max;
module.exports.opcion = (conexionMYSQL, limitXP, maxXP) => {
    if (isNaN(limitXP)) console.log('Limit limitXP is not a number');
    if (isNaN(maxXP)) console.log('Limit maxXP is not a number')

    limit = limitXP;
    max = maxXP;
}


module.exports.newLevel = (conexion, id, key) => {
    return new Promise((resolve, reject) => {
        let l = limit ? limit : 1000;
        let m = max ? max : 5;
        const random = Math.floor(Math.random() * m);

        if(random < 4) return;

        conexion.query('SELECT * FROM levels WHERE id = ? AND idKey = ? ', [id, key], (err, res) => {
            if (err) return reject(err);
            if (res.length === 0) {
                conexion.query('INSERT INTO levels (id, idKey, xp, lvl) VALUES (?, ?, ?, 0)', [id, key, random, 0], (err, res) => {
                    if (err) return reject(err);
                });
            }
            else {
                if (res[0].xp > l) {
                    if(res[0].lvl === 0) res[0].lvl = 1;
                    conexion.query('UPDATE levels SET lvl = ? WHERE id = ? AND idKey = ?', [res[0].lvl + 1, id, key], (err, res) => {
                        if (err) return reject(err);
                    });

                    conexion.query('UPDATE levels SET xp = 0 WHERE id = ? AND idKey = ?', [id, key], (err, res) => {
                        if (err) return reject(err);
                    });

                    resolve(res[0].lvl + res[0].lvl)
                }
                else {
                    conexion.query('UPDATE levels SET xp = xp + ? WHERE id = ? AND idKey = ?', [random, id, key], (err, res) => {
                        if (err) return reject(err);
                        
                    });
                }
            }
        })
    })
}