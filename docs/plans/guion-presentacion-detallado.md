# 🎬 Guion Detallado – Acortador de URLs Serverless en AWS

---

## 1️⃣ Introducción

Hoy vamos a construir un acortador de URLs completamente serverless en AWS.
Pero más allá de acortar links, el objetivo real es demostrar conceptos clave de arquitectura moderna:

(mostrar diagram en draw.io)

- **Request–reply sincrónico** para crear y redirigir URLs
- **Procesamiento asíncrono de eventos** para registrar clicks sin bloquear al usuario
- **Instrumentación de cold starts** medida desde el propio código
- **Dead Letter Queue (DLQ)** para mensajes que no pudieron procesarse
- **Infraestructura como código** 100% en TypeScript con SST v3



El stack tecnológico completo es:

| Capa | Servicio |
|---|---|
| API | Amazon API Gateway v2 (HTTP API) |
| Cómputo | AWS Lambda |
| Base de datos | Amazon DynamoDB (2 tablas) |
| Mensajería | Amazon SNS + DLQ (SQS) |
| IaC | SST v3 con TypeScript |
| Lenguaje | TypeScript (Node.js) |

---

## 2️⃣ Estructura del Proyecto (2 min)

El proyecto está organizado como un **monorepo** con dos paquetes internos:

```
packages/
  core/         ← lógica de dominio pura, sin dependencias de AWS
    src/
      url.ts        ← generateCode, isValidUrl
      analytics.ts  ← interfaces ClickEvent y ClickRecord
      index.ts      ← barrel de exports

  functions/    ← handlers de Lambda + acceso a infraestructura
    src/
      create.ts     ← POST /shorten
      redirect.ts   ← GET /{code}
      stats.ts      ← GET /stats/{code}
      track.ts      ← suscriptor SNS (procesa clicks)
      lib/
        handler.ts        ← withInstrumentation (wrapper)
        url-store.ts      ← DynamoDB: tabla de URLs
        analytics-store.ts← DynamoDB: tabla de analytics
        event-publisher.ts← SNS: publicar eventos de click
        index.ts          ← barrel de exports

sst.config.ts   ← toda la infraestructura definida como código
```

Esta separación es clave: `core` no sabe nada de AWS. Si mañana migramos a otro cloud, `core` no cambia.

---

## 3️⃣ El Paquete Core – Lógica de Dominio (2 min)

### `packages/core/src/url.ts`

```typescript
import { nanoid } from 'nanoid';

export function generateCode(length = 7): string {
  return nanoid(length);
}

export function isValidUrl(url: string): boolean {
  if (url.length > 2048) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

**`generateCode`**: usa `nanoid` para generar un código URL-safe de 7 caracteres por defecto.
- `nanoid` usa el alfabeto `A-Za-z0-9_-`, lo que da $64^7 \approx 4.4 \times 10^{12}$ combinaciones posibles.
- El parámetro `length` es opcional — lo veremos reutilizado con `length = 12` para los IDs de analytics.

**`isValidUrl`**: valida la URL con tres capas de defensa:
1. Rechaza URLs de más de 2048 caracteres (límite razonable).
2. Intenta parsearla con el constructor nativo `URL`.
3. Verifica que el protocolo sea `http:` o `https:` — bloquea `javascript:`, `data:`, `ftp:`, etc.

---

### `packages/core/src/analytics.ts`

```typescript
export interface ClickEvent {
  code: string;
  timestamp: number;
  userAgent: string;
  ip: string;
}

export interface ClickRecord extends ClickEvent {
  clickId: string;
}
```

Dos interfaces simples pero importantes:

- **`ClickEvent`**: el payload que se publica en SNS cuando ocurre un click. Es lo que viaja por el bus de eventos.
- **`ClickRecord`**: lo que se persiste en DynamoDB. Extiende `ClickEvent` añadiendo `clickId` — la clave primaria generada al guardar.

Esta distinción refleja un principio de diseño: el **evento** (lo que ocurrió) es diferente del **registro** (cómo se almacena).

---

## 4️⃣ La Infraestructura como Código – `sst.config.ts` (3 min)

Este archivo **define toda la infraestructura de AWS** sin salir de TypeScript.

### Configuración de la app

```typescript
app(input) {
  return {
    name: 'url-shortener',
    removal: input?.stage === 'production' ? 'retain' : 'remove',
    protect: ['production'].includes(input?.stage || ''),
    home: 'aws',
  };
},
```

- `removal: 'retain'` en producción: los recursos de AWS NO se eliminan aunque hagamos `sst remove`. Protección ante errores.
- `removal: 'remove'` en otros stages (dev, staging): limpieza automática para no pagar recursos huérfanos.
- `protect`: bloquea destrucciones accidentales en producción.

### Las dos tablas DynamoDB

```typescript
const urlTable = new sst.aws.Dynamo('UrlTable', {
  fields: { code: 'string' },
  primaryIndex: { hashKey: 'code' },
});
```

**UrlTable**: tabla simple. Clave primaria = `code`. Búsqueda directa por código en O(1).

```typescript
const analyticsTable = new sst.aws.Dynamo('AnalyticsTable', {
  fields: {
    clickId: 'string',
    code: 'string',
    timestamp: 'number',
  },
  primaryIndex: { hashKey: 'clickId' },
  globalIndexes: {
    codeIndex: { hashKey: 'code', rangeKey: 'timestamp' },
  },
});
```

**AnalyticsTable**: más compleja. Clave primaria = `clickId` (único por click). Pero también tiene un **GSI (Global Secondary Index)** llamado `codeIndex` con:
- `hashKey: 'code'` — para buscar todos los clicks de un código
- `rangeKey: 'timestamp'` — para ordenarlos cronológicamente

Esto permite queries eficientes del tipo "dame los últimos 10 clicks del código `abc123`".

### SNS + DLQ

```typescript
const clickTopic = new sst.aws.SnsTopic('ClickTopic');
const trackDlq = new sst.aws.Queue('TrackDLQ');
```

- **`ClickTopic`**: el bus de eventos donde se publican los clicks.
- **`TrackDLQ`**: Dead Letter Queue. Si la Lambda de tracking falla varias veces al procesar un mensaje, SNS lo manda aquí en lugar de descartarlo. Esto previene pérdida de datos.

### El suscriptor de SNS con DLQ

```typescript
clickTopic.subscribe('TrackSubscriber', {
  handler: 'packages/functions/src/track.handler',
  link: [analyticsTable, trackDlq],
  memory: '256 MB',
  timeout: '10 seconds',
  transform: {
    function: {
      deadLetterConfig: { targetArn: trackDlq.arn },
    },
  },
});
```

Noten `link: [analyticsTable, trackDlq]` — SST inyecta automáticamente los ARNs/nombres de los recursos como variables de entorno, **sin hardcodear nada**.

### Las rutas del API Gateway

```typescript
api.route('POST /shorten',      { handler: 'packages/functions/src/create.handler',   link: [urlTable] });
api.route('GET /{code}',        { handler: 'packages/functions/src/redirect.handler',  link: [urlTable, clickTopic] });
api.route('GET /stats/{code}',  { handler: 'packages/functions/src/stats.handler',     link: [analyticsTable] });
```

Cada ruta tiene acceso **mínimo** a los recursos que necesita. `create` solo puede escribir en `urlTable`. `redirect` puede leer `urlTable` y publicar en `clickTopic`. `stats` solo puede leer `analyticsTable`. Esto es **principio de mínimo privilegio**.

---

## 5️⃣ El Wrapper de Instrumentación – `handler.ts` (3 min)

Este archivo es uno de los más importantes del proyecto. Vamos línea por línea.

```typescript
export interface ApiGatewayEvent {
  body?: string;
  pathParameters?: Record<string, string>;
  headers?: Record<string, string>;
  requestContext?: {
    domainName?: string;
    http?: { sourceIp?: string };
  };
}

export interface SnsEvent {
  Records: { Sns: { Message: string } }[];
}
```

Interfaces TypeScript que modelan los eventos que recibe Lambda. En lugar de usar los tipos del SDK de AWS (que son pesados), se definen solo los campos que realmente usamos.

```typescript
export function withInstrumentation(
  name: string,
  fn: LambdaHandler,
  opts?: InstrumentationOptions,
): LambdaHandler {
  const coldStartTime = Date.now();
  let isColdStart = true;
```

Aquí ocurre algo muy elegante. `coldStartTime` y `isColdStart` viven **fuera de la función interna**. Eso significa que se inicializan **una sola vez**, cuando Lambda carga el módulo — es decir, en el cold start.

```typescript
  return async (event) => {
    const startTime = Date.now();
    const wasColdStart = isColdStart;
    isColdStart = false;  // ← al segundo request, ya es false
```

En cada invocación capturamos si fue un cold start y lo marcamos `false` para las siguientes.

```typescript
    try {
      const result = await fn(event);
      return result;
    } catch (err) {
      success = false;
      if (opts?.rethrow === true) throw err;
      // ...log del error
      return { statusCode: 500, ... };
    } finally {
      console.log(JSON.stringify({
        handler: name,
        coldStart: wasColdStart,
        initDuration: wasColdStart ? startTime - coldStartTime : 0,
        executionDuration: Date.now() - startTime,
        success,
      }));
    }
```

El `finally` **siempre** se ejecuta, éxito o error. Loguea:
- `coldStart`: fue la primera invocación del contenedor
- `initDuration`: cuánto tardó Lambda en inicializar (solo reportado en cold starts)
- `executionDuration`: cuánto tardó el handler en responder

Estos logs son **structured JSON** — CloudWatch Logs Insights puede queryarlos directamente para métricas.

La opción `rethrow: true` la usa `track.ts` para que SNS pueda reintentar al recibir un error.

---

## 6️⃣ Flujo 1 – POST /shorten – `create.ts` (3 min)

```typescript
import { generateCode, isValidUrl } from '@url-shortener/core';
import { UrlStore } from './lib/url-store.js';
import { withInstrumentation, type ApiGatewayEvent } from './lib/handler.js';
```

Los imports muestran el diseño en capas: `core` para lógica de negocio, `lib` para infraestructura.

```typescript
export const handler = withInstrumentation('create', async (raw) => {
  const event = raw as ApiGatewayEvent;
  let body: { url?: string };
  try {
    body = JSON.parse(event.body ?? '{}') as { url?: string };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
```

El body de API Gateway llega como string. Lo parseamos con try/catch — si el cliente manda JSON malformado, respondemos 400 inmediatamente.

```typescript
  if (url === undefined || url === '' || !isValidUrl(url)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid URL' }) };
  }

  const code = generateCode();
  const domain = event.requestContext?.domainName ?? 'localhost';
  await UrlStore.save(code, url);

  return {
    statusCode: 201,
    body: JSON.stringify({ shortUrl: `https://${domain}/${code}`, code }),
  };
```

Validación → generación del código → escritura → respuesta. Noten `statusCode: 201 Created` (no 200) — semánticamente correcto para creación de recursos.

`domainName` viene del contexto de API Gateway. Usamos `?? 'localhost'` para que el código funcione también en tests locales.

---

### `lib/url-store.ts` – Acceso a DynamoDB

```typescript
const client = DynamoDBDocumentClient.from(new DynamoDBClient());
const urlTableName: string = Resource.UrlTable.name;
```

`Resource.UrlTable.name` es la magia de SST: en runtime, SST inyecta el nombre real de la tabla de DynamoDB como variable de entorno tipada. No hay strings hardcodeados.

`DynamoDBDocumentClient` es una capa sobre el cliente base que serializa/deserializa automáticamente los tipos de DynamoDB (no necesitamos escribir `{ S: "valor" }`).

```typescript
async save(code: string, originalUrl: string): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: urlTableName,
      Item: { code, originalUrl, createdAt: Date.now() },
      ConditionExpression: 'attribute_not_exists(code)',
    }),
  );
},
```

`ConditionExpression: 'attribute_not_exists(code)'` es importante: DynamoDB solo escribe el item **si el código no existe**. Si `nanoid` generara el mismo código dos veces (improbable pero posible), la segunda escritura fallaría en lugar de sobreescribir.

```typescript
async findByCode(code: string): Promise<UrlRecord | null> {
  const result = await client.send(
    new GetCommand({ TableName: urlTableName, Key: { code } }),
  );
  return (result.Item as UrlRecord | undefined) ?? null;
},
```

`GetCommand` es una lectura puntual por clave primaria — la operación más rápida en DynamoDB, O(1) garantizado.

---

## 7️⃣ Flujo 2 – GET /{code} – `redirect.ts` (4 min)

Este es el flujo arquitectónicamente más rico.

```typescript
const CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;
```

Validamos el código antes de ir a DynamoDB. Si alguien manda `../../../../etc/passwd`, el regex lo rechaza en microsegundos sin tocar la base de datos.

```typescript
const record = await UrlStore.findByCode(code);
if (record === null) {
  return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
}
```

Si el código no existe en DynamoDB, respondemos 404. Simple.

```typescript
// Validate stored URL scheme before redirecting (defense-in-depth)
let isValidScheme = false;
try {
  const parsed = new URL(record.originalUrl);
  isValidScheme = parsed.protocol === 'http:' || parsed.protocol === 'https:';
} catch { }
```

Esta validación parece redundante — ya validamos al guardar. Pero es **defensa en profundidad**: si alguien insertara datos directamente en DynamoDB saltándose la API, o si hubiera un bug anterior, esta validación protege a los usuarios de ser redirigidos a URLs maliciosas como `javascript:alert('xss')`.

```typescript
await EventPublisher.publishClick({
  code,
  timestamp: Date.now(),
  userAgent: event.headers?.['user-agent'] ?? 'unknown',
  ip: event.requestContext?.http?.sourceIp ?? 'unknown',
});

return {
  statusCode: 302,
  headers: {
    Location: record.originalUrl,
    'Cache-Control': 'no-cache, no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  },
  body: '',
};
```

Primero publicamos el evento en SNS, luego respondemos 302. El usuario es redirigido **inmediatamente**. El tracking ocurre en paralelo — otra Lambda procesará el evento de forma asíncrona.

Los headers de seguridad:
- `Cache-Control: no-cache, no-store` — evita que proxies o browsers cacheen la redirección obsoleta.
- `Referrer-Policy: no-referrer` — la URL destino no sabrá desde dónde viene el usuario.
- `X-Content-Type-Options: nosniff` — previene ataques MIME sniffing.

---

### `lib/event-publisher.ts` – Publicar en SNS

```typescript
const sns = new SNSClient();
const clickTopicArn: string = Resource.ClickTopic.arn;

export const EventPublisher = {
  async publishClick(event: ClickEvent): Promise<void> {
    await sns.send(
      new PublishCommand({
        TopicArn: clickTopicArn,
        Message: JSON.stringify(event),
      }),
    );
  },
};
```

SNS recibe el evento como JSON string. El `arn` del topic también viene de `Resource.ClickTopic.arn` — inyectado por SST. Sin configuración manual, sin variables de entorno hardcodeadas.

Publicar en SNS es **sub-milisegundo** en la misma región. Por eso no impacta perceptiblemente la latencia del redirect.

---

## 8️⃣ Flujo 3 – Procesamiento Asíncrono – `track.ts` (3 min)

Este handler **no** responde a API Gateway. Es activado por SNS cuando llega un mensaje al topic.

```typescript
export const handler = withInstrumentation(
  'track',
  async (raw) => {
    const event = raw as SnsEvent;
    const results = await Promise.allSettled(
      event.Records.map(async (record) => {
```

`event.Records` es un array — SNS puede entregar múltiples mensajes en un solo batch. Procesamos todos en paralelo con `Promise.allSettled`.

`Promise.allSettled` (en lugar de `Promise.all`) es importante: si un mensaje del batch falla, los otros siguen procesándose. `Promise.all` cancelaría todo al primer error.

```typescript
        const clickEvent = JSON.parse(record.Sns.Message) as ClickEvent;

        if (
          typeof clickEvent.code !== 'string' ||
          typeof clickEvent.timestamp !== 'number' ||
          typeof clickEvent.userAgent !== 'string' ||
          typeof clickEvent.ip !== 'string'
        ) {
          console.error('Invalid click event shape', { raw: record.Sns.Message });
          return;
        }
```

Aunque TypeScript garantiza tipos en compile-time, aquí validamos **en runtime**. El mensaje viene de la red (de SNS) — podría ser cualquier cosa. Esta validación previene que datos corruptos lleguen a DynamoDB.

```typescript
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      throw new Error(`${failed}/${results.length} records failed`);
    }
```

Si algún registro falló, lanzamos un error. Combinado con `{ rethrow: true }` en `withInstrumentation`, el error propagado hace que SNS **reintente** la entrega del mensaje. Y si sigue fallando, eventualmente va a la DLQ.

---

### `lib/analytics-store.ts` – Guardar y Consultar Clicks

```typescript
async saveClick(event: ClickEvent): Promise<void> {
  const clickId = generateCode(12);
  await client.send(
    new PutCommand({
      TableName: analyticsTableName,
      Item: { clickId, ...event },
    }),
  );
},
```

Generamos un `clickId` de 12 caracteres con `nanoid` (reutilizando `generateCode` del core). El spread `...event` expande `{ code, timestamp, userAgent, ip }` directamente en el item de DynamoDB.

```typescript
async findByCode(code: string, limit = 10): Promise<ClickRecord[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: analyticsTableName,
      IndexName: 'codeIndex',
      KeyConditionExpression: 'code = :code',
      ExpressionAttributeValues: { ':code': code },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (result.Items as ClickRecord[] | undefined) ?? [];
},
```

`IndexName: 'codeIndex'` — usa el GSI definido en `sst.config.ts`.
`ScanIndexForward: false` — ordena descendente (más reciente primero).
`Limit: limit` — paginación automática.

```typescript
async countByCode(code: string): Promise<number> {
  const result = await client.send(
    new QueryCommand({
      // ...misma query
      Select: 'COUNT',
    }),
  );
  return result.Count ?? 0;
},
```

`Select: 'COUNT'` le dice a DynamoDB que no devuelva los items, solo el conteo. Mucho más eficiente para counters grandes.

---

## 9️⃣ Flujo 4 – GET /stats/{code} – `stats.ts` (2 min)

```typescript
const [recentClicks, totalClicks] = await Promise.all([
  AnalyticsStore.findByCode(code, 10),
  AnalyticsStore.countByCode(code),
]);

return {
  statusCode: 200,
  body: JSON.stringify({ code, totalClicks, recentClicks }),
};
```

Las dos queries a DynamoDB se hacen **en paralelo** con `Promise.all`. En lugar de esperar una y luego la otra (suma de latencias), esperamos ambas simultáneamente (máximo de las dos latencias). En DynamoDB típicamente 1–5ms cada una.

---

## 🔟 Cold Starts – Medición Real en el Código (2 min)

Volvamos a `handler.ts` para entender cómo medimos cold starts desde el código:

```typescript
const coldStartTime = Date.now();  // ← ejecuta al cargar el módulo
let isColdStart = true;

return async (event) => {
  const startTime = Date.now();
  const wasColdStart = isColdStart;
  isColdStart = false;
  // ...
  // En finally:
  initDuration: wasColdStart ? startTime - coldStartTime : 0,
```

`initDuration` es la diferencia entre:
- Cuando Lambda cargó el módulo (`coldStartTime`)
- Cuando llegó el primer evento (`startTime`)

Ese tiempo es el **init duration** real — carga del runtime de Node.js, parseo del módulo TypeScript compilado, importación de SDKs de AWS, etc.

En Lambdas con 256MB de memoria como las nuestras, un cold start típico es **100–300ms** para Node.js con pocos SDKs. Significativamente menor que JVM o .NET.

---

## 1️⃣1️⃣ Auto-Scaling y Concurrencia (2 min)

Cada una de nuestras Lambdas puede escalar **independientemente**:

- Si hay 10,000 clicks simultáneos en `GET /{code}`, AWS crea hasta 10,000 instancias de `redirect.ts` en paralelo.
- Si el tracking de analytics va más lento, SNS simplemente va acumulando mensajes. Los clicks nunca se bloquean.
- `track.ts` puede ir consumiendo el backlog a su ritmo.

Esto es el **desacoplamiento asíncrono** en acción. La redirección y el analytics escalan de forma completamente independiente.

DynamoDB con `PAY_PER_REQUEST` (el modo que SST usa por defecto) también escala automáticamente — no hay que provisionar WCUs/RCUs.

---

## 1️⃣2️⃣ Modelo de Costos Serverless vs Contenedores (2 min)

Con este acortador en reposo, el costo es prácticamente **$0**:

| Recurso | Costo en reposo |
|---|---|
| Lambda | $0 (solo pagas por ejecuciones) |
| DynamoDB on-demand | $0 (solo pagas por reads/writes) |
| SNS | $0 (solo pagas por mensajes publicados) |
| API Gateway | $0 (solo pagas por requests) |

Con un contenedor equivalente (ECS Fargate o EC2):
- Pagas 24/7, haya tráfico o no.
- Con solo 1 instancia t3.small: ~$15–20/mes fijos.

**Serverless gana en cargas variables e impredecibles. Contenedores ganan en cargas altas y constantes**, donde el costo por request puede ser menor.

---

## 1️⃣3️⃣ Seguridad – Capas de Defensa (1 min)

El proyecto implementa defensa en múltiples capas:

1. **`isValidUrl`** en core: valida protocolo y longitud al guardar.
2. **`CODE_REGEX`** en redirect y stats: valida el código antes de tocar DynamoDB.
3. **Validación de protocolo en redirect**: re-valida la URL almacenada antes de redirigir.
4. **Validación de forma en track**: verifica los tipos del evento SNS en runtime.
5. **`ConditionExpression`** en DynamoDB: previene sobreescritura de códigos existentes.
6. **Headers de seguridad**: `no-referrer`, `no-store`, `nosniff` en el redirect.
7. **Mínimo privilegio**: cada Lambda tiene acceso solo a los recursos que necesita.

---

## 1️⃣4️⃣ ¿Qué Demostramos? (1 min cierre)

Con este proyecto demostramos:

✔ **Arquitectura en capas**: `core` separado de `functions` separado de infraestructura  
✔ **Request–reply sincrónico**: `create.ts` y `stats.ts`  
✔ **Procesamiento asíncrono con eventos**: `redirect.ts` → SNS → `track.ts`  
✔ **Desacoplamiento real**: redirección y analytics escalan independientemente  
✔ **Instrumentación de cold starts** medida desde el código mismo  
✔ **Dead Letter Queue**: para mensajes que no pudieron procesarse  
✔ **Seguridad en profundidad**: múltiples capas de validación  
✔ **Mínimo privilegio**: cada Lambda con permisos exactos  
✔ **Infraestructura como código** con SST v3 en TypeScript  
✔ **Modelo de costos basado en uso** con $0 en reposo  

---

## 🎯 Cierre Final (30 seg)

Un acortador de URLs parece trivial. Pero este código encapsula decisiones de arquitectura que aplican a sistemas de cualquier escala:

- **¿Qué debe ser sincrónico y qué asíncrono?**
- **¿Cómo desacoplar componentes sin perder datos?**
- **¿Cómo medir lo que importa desde el código mismo?**
- **¿Cómo escalar sin infraestructura que administrar?**

Este es el tipo de razonamiento que diferencia un sistema bien diseñado de uno que simplemente funciona.
