# ¡Zeew Levels!

![Zeew Api](https://i.imgur.com/MP2bABn.png "Lo Mejor de Zeew")
- [¡Zeew Levels!](#zeew-levels)
  - [Informacion](#informacion)
  - [Como usarlo](#como-usarlo)
- [Metodos](#metodos)
  - [Principal](#principal)
    - [main: options](#main-options)
    - [main: newLevel](#main-newlevel)
  - [Obtener](#obtener)
    - [Get: Level](#get-level)
    - [Get: XP](#get-xp)
    - [Get: TOP](#get-top)
  - [Agregar](#agregar)
    - [set: Level](#set-level)
    - [set: XP](#set-xp)
  - [Eliminar](#eliminar)
    - [delete: User](#delete-user)
    - [delete: All](#delete-all)


## Informacion

Yo se que quieres un sistema de niveles para tu bot de discord o tu app, a si que he pensando en ti 7w7 y he hecho este modulo.

Este modulo esta creado para usar con mysql, ya que es te no explotara cuando los datos sean demaciados.

Te recomiendo usar alwaysdata para tener una base de datos mysql de manera gratis.

#ZeewDEV <br>
#ZeewTEAM

Recuerda que si encuentras algun error, quieres aportar con una donacion o con codigo, puedes ingresar a nuestro servidor de discord o nuestra cuenta de twitter, github.

Si quieres ver un **ejemplo** puedes ir al github o ir a nuestra web.

## Como usarlo

Todas las funciones de zeew levels son `asyncronos`, a si que no olvides el `await` y `async`

Primero debes hacer la conexion de mysql, te recomiendo usar mysql2.
A qui te dejo el ejemplo. Se lo que necesitaras.

```js
const mysql = require('mysql2');

const conexionMYSQL = mysql.createConnection({
    host,
    user,
    database
});
```

Una vez que lo tengas, pasa la conexion de mysql a zeewlevels.

> `NOTA` Esta funcion solo debe existir una vez. Colocalo en el archivo principal.
```js
zeewLevels.conexion(conexionMYSQL)
```

y ahora podras usar las funciones.

# Metodos

La `key` es un indentificador. Por ejemplo la id del servidor, pero si sera global, pone algo que siempre tendran.

La `id` es el indentifacdor del usuario.

La `amount` es la cantidad que sera añadida o removida

El `limit` es para obtener cierta cantidad de datos

El `limitXP` es el limite de XP que necesita para que suba de nivel. Por defecto sera 1000.

El `maxXP` el maximo de XP random que pueden obtener. Por defecto sera de 5.

## Principal

### main: options

```js
zeewLevels.main.options({limitXP, maxXP});
```

### main: newLevel

Esta es la funcion que debes colocar en el evento de mensajes para que suban de nivel. <br>
Esta funcion tambien regresa el nivel subido.

```js
zeewLevels.main.newLevel(id, key);
```

## Obtener

### Get: Level

```js
zeewLevels.get.Level(id, key);
```

### Get: XP

```js
zeewLevels.get.XP(id, key);
```

### Get: TOP

```js
zeewLevels.get.TOP(key, limit);
```

## Agregar

### set: Level

```js
zeewLevels.set.Level(id , key, amount);
```

### set: XP
```js
zeewLevels.set.XP(id , key, amount);
```

## Eliminar

### delete: User

```js
zeewLevels.delete.user(id, id);
```

### delete: All

Este elimina todo los datos en la base de datos, ten cuidado.

```js
 zeewLevels.delete.all(key);
```