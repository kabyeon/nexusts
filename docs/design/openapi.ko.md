# OpenAPI 모듈 — 디자인

> English version: [`openapi.md`](./openapi.md)

이 문서는 `@nexusts/openapi`의 아키텍처를 설명한다: Zod-to-JSON-Schema
변환, 데코레이터 기반 operation 메타데이터, Scalar UI 통합, 자동 생성
파이프라인.

## 목표

1. **컨트롤러 + Zod 스키마에서 OpenAPI 3.1 spec 자동 생성.** 손으로 작성한
   `openapi.json` 없음.
2. **Zod가 single source of truth.** 요청 검증 (`@Validate`)에 사용된 같은
   Zod 스키마가 API 문서화에 재사용됨.
3. **데코레이터 기반 operation 메타데이터.** `@ApiOperation`, `@ApiResponse`,
   `@ApiParam`, `@ApiTags` — NestJS/Swagger 스타일.
4. **내장 Scalar UI.** `/openapi`는 JSON spec 제공; `/openapi/ui`는 Scalar의
   아름다운 인터랙티브 문서 UI 제공.
5. **비침습적.** OpenAPI 데코레이터 없는 컨트롤러도 동작; spec에만
   나타나지 않음.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Controller                                │
│                                                             │
│  @Get('/users/:id')                                         │
│  @ApiOperation({ summary: 'Get user by ID' })               │
│  @ApiParam({ name: 'id', schema: z.string() })              │
│  @ApiResponse({ status: 200, schema: UserSchema })          │
│  @ApiTags('Users')                                          │
│  findById(@Param('id') id: string) { ... }                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│         OpenAPIService                                       │
│                                                             │
│  1. 등록된 모든 컨트롤러 스캔                                │
│  2. Hono 라우터에서 라우트 메타데이터 읽기                     │
│  3. 라우트별 데코레이터 메타데이터 읽기                       │
│  4. Zod 스키마 → JSON Schema 변환 (draft 2020-12)          │
│  5. OpenAPI 3.1 document 조립                               │
│  6. GET /openapi에서 JSON 제공 (JSON)                       │
│  7. GET /openapi/ui에서 Scalar UI 제공 (HTML)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             출력                                            │
│                                                             │
│  GET /openapi         → application/vnd.oai.openapi+json    │
│  GET /openapi/ui      → text/html  (Scalar UI)              │
│  nx openapi:generate  → openapi.json을 디스크에 작성         │
└─────────────────────────────────────────────────────────────┘
```

## Zod to JSON Schema

`zodToJsonSchema()` 함수가 Zod 타입을 JSON Schema (draft 2020-12,
OpenAPI 3.1 호환)로 변환:

| Zod 타입 | JSON Schema |
|----------|-------------|
| `z.string()` | `{ type: "string" }` |
| `z.number()` | `{ type: "number" }` |
| `z.boolean()` | `{ type: "boolean" }` |
| `z.object({...})` | `{ type: "object", properties: {...}, required: [...] }` |
| `z.array(z.string())` | `{ type: "array", items: { type: "string" } }` |
| `z.enum(["a", "b"])` | `{ type: "string", enum: ["a", "b"] }` |
| `z.optional(z.string())` | `required` 배열에 없음 |
| `z.nullable(z.string())` | `{ type: "string", nullable: true }` |
| `z.union([...])` | `{ anyOf: [...] }` |
| `z.intersection(...)` | `{ allOf: [...] }` |
| `z.string().email()` | `format: "email"` 추가 |
| `z.string().min(3)` | `minLength: 3` 추가 |
| `z.number().int()` | `type: "integer"` 추가 |
| `z.string().describe("...")` | `description` 추가 |
| 커스텀 refinements | 무시 (스키마 레벨만) |

컨버터는 `$defs` 레지스트리를 통해 재귀 스키마를 처리하고, visited-set으로
순환 참조를 감지.

## 데코레이터 API

### 라우트 레벨

| 데코레이터 | 부착 위치 | 저장 |
|-----------|------------|------|
| `@ApiTags(...)` | Controller 클래스 | 태그 이름 |
| `@ApiOperation({summary, description, deprecated, operationId})` | 메서드 | Operation 메타데이터 |
| `@ApiParam({name, schema, description, required})` | 메서드 파라미터 | Path parameters |
| `@ApiQuery({name, schema, description, required})` | 메서드 | Query parameters |
| `@ApiBody({schema, description, required})` | 메서드 | Request body |
| `@ApiResponse({status, schema, description})` | 메서드 | Response schemas |
| `@ApiSecurity({name, scopes?})` | 메서드/클래스 | Security requirements |
| `@ApiSchema({name, ...})` | 클래스 | Schema 정의 (재사용 가능) |
| `@ApiExclude()` | 메서드/컨트롤러 | spec에서 제외 |

### 스키마 레벨

`@ApiProperty({description, example, deprecated})`는 모델 클래스에
추가되어 필드별 메타데이터. Zod 스키마에 추가 문서 힌트가 필요할 때 사용.

### `@ApiTags`로 그룹화

```ts
@Controller('/users')
@ApiTags('Users')
class UserController { ... }
```

태그는 Scalar UI 사이드바에서 endpoint를 그룹화. 컨트롤러는 여러 태그
(union)를 가질 수 있음.

## Scalar UI

UI는 `scalarHtml()`을 통해 렌더링되며, Scalar의 CDN 호스팅 JavaScript를
로드하는 인라인 HTML 페이지를 반환. 이 페이지는:

1. 상대 URL `/openapi`에서 OpenAPI spec을 fetch.
2. 다크 모드, 코드 샘플, Try-it-out이 있는 인터랙티브 문서 렌더.

```ts
// 커스터마이즈
scalarHtml({
  title: 'My API',
  theme: 'purple',     // 'default' | 'purple' | 'moon' | 'solarized'
  layout: 'modern',     // 'modern' | 'classic'
})
```

## CLI 통합

```sh
nx openapi:generate       # → openapi.json
nx openapi:generate --output ./docs/openapi.json
```

CLI 명령은 `OpenAPIService.generate()`를 호출하여 spec을 빌드하고 디스크에
작성. CI 체크와 API 문서 발행에 유용.

## 생성된 spec 포맷

```yaml
openapi: "3.1.0"
info:
  title: "NexusTS API"
  version: "1.0.0"
paths:
  /users/{id}:
    get:
      tags: ["Users"]
      summary: "Get user by ID"
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: "string" }
      responses:
        200:
          description: "OK"
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: "integer" }
        name: { type: "string" }
```

## Future work

- **WebSocket endpoint** — 데코레이터를 통한 WS 메시지 스키마 문서화.
- **인증 플로우** — OAuth2 / OpenID Connect security scheme 생성.
- **OpenAPI diff** — spec 버전 비교용 CLI 명령 (breaking change 감지).
- **요청 예시** — Zod 스키마 기본값에서 자동 생성.
- **OpenAPI 3.0 호환** — 3.1을 지원하지 않는 도구를 위한 옵션 downgrade
  모드.

## 참고

- [`../user-guide/openapi.ko.md`](../user-guide/openapi.ko.md) — 사용자 가이드
- [`../user-guide/validation.ko.md`](../user-guide/validation.ko.md) — Zod 검증
  (Zod 스키마가 single source of truth)
