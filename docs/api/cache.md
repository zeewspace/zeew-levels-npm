# Caché LRU

> Sistema de caché con expiración TTL para optimizar lecturas.

## Descripción

zeew-levels incluye un caché LRU (Least Recently Used) que almacena registros de usuario en memoria. Esto reduce dramaticamente las consultas a la base de datos en bots con alto tráfico.

## Configuración

```typescript
const levels = new ZeewLevels(adapter, {
  cache: {
    enabled: true,      // Habilitar caché
    maxSize: 5000,      // Máximo de usuarios en caché (default: 1000)
    ttl: 300000,        // Time-to-live en milisegundos (default: 60000 = 1 min)
  },
});
```

## Cómo Funciona

1. **Lectura:** Al consultar un usuario (`getLevel`, `getXp`, `getUser`), primero busca en caché. Si está, retorna instantáneamente sin consultar la DB.
2. **Escritura:** Al modificar datos (`processMessage`, `addXp`, `setLevel`), se invalida la entrada del caché forzando una lectura fresca en la próxima consulta.
3. **Expiración:** Las entradas expiran automáticamente después del TTL configurado.
4. **Evicción:** Cuando el caché está lleno, se elimina la entrada menos recientemente usada.

## Comportamiento por Operación

| Operación | Caché |
|-----------|-------|
| `getLevel()` | Lee de caché si existe |
| `getXp()` | Lee de caché si existe |
| `getUser()` | Lee de caché si existe |
| `processMessage()` | Invalida después de escribir |
| `addXp()` | Invalida después de escribir |
| `setLevel()` | Invalida después de escribir |
| `setXp()` | Invalida después de escribir |
| `deleteUser()` | Invalida la entrada |
| `deleteAll()` | Limpia todo el caché |

## Cuándo Usarlo

**Usa caché si:**
- Tu bot tiene >100 mensajes por minuto
- Quieres reducir latencia en comandos de ranking
- Tu base de datos está en un servidor remoto

**No uses caché si:**
- Tu bot tiene poco tráfico
- Necesitas consistencia fuerte (caché puede tener stale data de ~1 segundo)
- Estás usando MemoryAdapter (ya está en memoria)

## Ejemplo con Discord.js

```typescript
const levels = new ZeewLevels(adapter, {
  cache: { enabled: true, maxSize: 10000, ttl: 60000 },
});

// Estas llamadas son ultrarrápidas después de la primera
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.commandName === "rank") {
    const stats = await levels.getUserStats(
      interaction.user.id,
      interaction.guildId!
    );
    // Responde instantáneamente
    interaction.reply({ embeds: [rankCard(stats, interaction.user.username)] });
  }
});
```

## Notas de Implementación

- El caché usa un `Map` interno con orden de inserción
- Las entradas son copias superficiales del registro (no referencias)
- El `prune()` elimina entradas expiradas manualmente
- El caché es por instancia de `ZeewLevels` (no compartido entre instancias)
