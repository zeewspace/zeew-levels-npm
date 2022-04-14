const getMaximumXP = (lvl) => {
    return 10 * lvl ** 2 + 100 * lvl ** 2;
  };
  
  const formulateTheXp = (t_1, t_2, n) => {
    var b = this.getMaximumXP(t_2) - t_1;
    var a = 220;
  
    return t_1 * n + b * ((n * (n - 1)) / 2) + a * ((n * (n - 1) * (n - 2)) / 6);
  };
  
  const append_Xp = (xp, more_xp, lvl) => {
    var new_xp = xp + more_xp;
    var new_lvl = Math.floor(Math.sqrt(new_xp / 110));
  
    if (new_xp >= this.getMaximumXP(lvl)) {
      var leveled = new_lvl;
      if (lvl === new_lvl) leveled++;
  
      var n = (new_lvl - lvl) / 1 + 1;
  
      var remain_xp = Math.abs(
        new_xp - this.formulateTheXp(this.getMaximumXP(lvl), lvl + 1, n)
      );
      if (remain_xp >= this.getMaximumXP(leveled)) {
        remain_xp = Math.abs(
          new_xp - this.formulateTheXp(this.getMaximumXP(lvl), lvl + 1, n - 1)
        );
        leveled = leveled - 1;
      }
      return {
        new_xp: remain_xp,
        new_lvl: leveled,
        new_max_xp: this.getMaximumXP(l),
      };
    } else {
      return { new_xp: new_xp, new_lvl: lvl, new_max_xp: this.getMaximumXP(l) };
    }
  };
  
  module.exports = {
      getMaximumXP,
      formulateTheXp,
      append_Xp,  
  }