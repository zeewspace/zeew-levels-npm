```js
  const { ZeewLevel } = require("./index");
  const zeewlvl = new ZeewLevel({
    isGlobal: false,
    isXpUp: true,
    cooldown: {
      deleteCache: 1000 * 60 * 60 * 24 * 7,
      timeFarmer: 30000,
    },
  });

  zeewlvl.farmear("zeewlevel", "kamerrezz");

  zeewlvl.getData("zeewlevel", "kamerrezz").then((data) => {
    console.log(data);
  });

  zeewlvl.getAllLvl("zeewlevel").then((data) => {
    console.log(data);
  });

  zeewlvl.leaderboard("zeewlevel").then((data) => {
    console.log(data);
  });
```