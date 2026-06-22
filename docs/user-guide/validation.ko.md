# 검증

> English version: [`validation.md`](./validation.md)

검증은 옵트인, Zod 기반이며 `@Validate(...)` 데코레이터를 통해 적용됩니다. 컨트롤러 메서드가 호출되기 **전에** 실행되므로, 실패한 요청은 비즈니스 로직에 도달하지 않습니다.

## 1. `@Validate` 데코레이터

```ts
import { z } from 'zod';
import { Body, Controller, Param, Post, Query, Validate } from '@nexusts/core';

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

@Controller('/users')
export class UserController {
  @Post('/')
  @Validate({
    body: CreateUserSchema,
    query: z.object({ notify: z.coerce.boolean().optional() }),
    params: z.object({ id: z.coerce.number().int() }),
  })
  async create(
    @Body() body: z.infer<typeof CreateUserSchema>,
    @Query() query: { notify?: boolean },
    @Param() params: { id: number },
  ) {
    return this.users.create({ ...body, notify: query.notify, id: params.id });
  }
}
```

데코레이터 인자의 각 키는 **선택 사항**입니다 — 검증하려는 소스만 선언하세요.

| 키 | 검증 대상 | 읽기 |
| --- | --------- | ---------- |
| `body` | 요청 본문 | `@Body()` |
| `query` | URL 쿼리 스트링 | `@Query()` |
| `params` | 경로 파라미터 | `@Param()` |
| `headers` | 요청 헤더 | `@Headers()` |

---

## 2. 검증 실패 응답

검증 실패는 세부 정보와 함께 **400 Bad Request**을 반환합니다.

```json
{
  "error": "Validation failed",
  "issues": [
    {
      "code": "invalid_string",
      "validation": "email",
      "path": ["email"],
      "message": "Invalid email"
    },
    {
      "code": "too_small",
      "minimum": 2,
      "type": "string",
      "inclusive": true,
      "path": ["name"],
      "message": "String must contain at least 2 character(s)"
    }
  ]
}
```

`issues` 배열은 [Zod의 이슈 포맷](https://zod.dev/?id=handling-errors)을 따르므로 클라이언트에서 익숙한 형태로 응답을 포맷팅할 수 있습니다.

---

## 3. 강제 변환

쿼리 스트링과 경로 파라미터는 **항상 문자열**이므로 Zod의 강제 변환 헬퍼를 사용하세요.

```ts
@Validate({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    sort: z.enum(['asc', 'desc']).default('asc'),
    dryRun: z.coerce.boolean().optional(),
  }),
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
})
```

`z.coerce.*`는 검증 전에 입력에 대해 `Number(...)`, `Boolean(...)` 등을 실행하여 스키마가 타입된 값을 보도록 합니다.

---

## 4. 재사용 가능한 스키마

`dto/` 디렉터리에 스키마를 정의하고 가져옵니다.

```
app/
├── modules/
│   └── user/
│       ├── user.controller.ts
│       ├── user.service.ts
│       └── dto/
│           ├── create-user.dto.ts
│           └── update-user.dto.ts
```

```ts
// dto/create-user.dto.ts
import { z } from 'zod';

export const CreateUserDto = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
});

export type CreateUser = z.infer<typeof CreateUserDto>;
```

```ts
// user.controller.ts
import { CreateUserDto } from './dto/create-user.dto.js';

@Post('/')
@Validate({ body: CreateUserDto })
create(@Body() body: CreateUser) {
  return this.users.create(body);
}
```

---

## 5. 부분 업데이트

PATCH 엔드포인트의 경우 필드를 옵셔널로 표시하세요.

```ts
export const UpdateUserDto = CreateUserDto.partial();
```

PUT 엔드포인트의 경우 스키마는 **strict**해야 합니다 — 모든 필드가 필수.

---

## 6. 필드 간 검증

필드 간 규칙에는 Zod의 `.refine(...)`을 사용하세요.

```ts
const SignupDto = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });
```

---

## 7. 비동기 / 컨텍스트 인식 검증

외부 상태(고유성 검사 등)가 필요한 규칙의 경우 `.refine`에 async 함수를 사용하고 `parseAsync`를 호출하세요.

```ts
const CreateUserDto = z.object({
  email: z.string().email(),
}).refine(
  async (d) => !(await this.users.findByEmail(d.email)),
  { message: '이미 사용 중인 이메일입니다', path: ['email'] },
);
```

전체 비동기 검증이 필요한 컨트롤러의 경우, 프레임워크가 핸들러를 호출하기 전에 결과를 기다립니다. refine이 throw하면 요청은 400을 반환합니다.

---

## 8. 커스텀 에러 응답

400 응답 형태를 커스터마이즈하려면 `@Validate`를 자체 데코레이터로 감싸거나 (또는 미들웨어에서 후처리하세요).

```ts
import { Validate, type ValidationConfig } from '@nexusts/core';
import { ZodError } from 'zod';

export function ValidateV2(config: ValidationConfig) {
  // @Validate는 평범한 데코레이터 — Zod 에러를
  // 원하는 형태로 변환하기 위해 얇은 레이어로 감쌈.
  return Validate(config);
}
```

향후 릴리스에서는 완전히 커스텀 400 응답을 위한 `@UseValidationFilter(...)` 데코레이터가 추가될 예정입니다.

---

## 9. 검증 우회

검증을 완전히 건너뛰려면 (예: 자유 형식 본문을 받는 웹훅) `@Validate`를 적용하지 마세요. `@Body()` 파라미터는 파싱된 객체를 그대로 받습니다.

신뢰할 수 없는 입력의 경우 **항상** 검증하세요 — `z.object({}).passthrough()`도 스키마 없는 것보다 낫습니다.

---

## 10. 일반적인 함정

| 함정 | 해결 |
| ------- | --- |
| `z.coerce.number()`가 `"42"`를 `42`로 변환하지 않음 | Zod가 raw string을 보는 컨텍스트에서 실행 중일 수 있음. `@Validate`가 핸들러 **이전에** 실행되는지 확인. |
| `path: ["user", "email"]`이 아닌 `path: ["email"]` | Zod path는 입력 객체가 아닌 스키마 구조를 따름 — 내부 객체에 대한 `.refine`은 평탄화함. 최상위 필드에는 `path: ['email']` 사용. |
| 검증은 통과하지만 `body`가 `undefined` | 본문이 JSON으로 전송되지 않음. 클라이언트에 `Content-Type: application/json` 설정. |
| `params.id`가 항상 string | params 스키마에서 `z.coerce.number()`를 사용하고, `@Param('id')`로 타입된 값을 추출. |
| 런타임에 스키마를 찾을 수 없음 | 존재하지 않는 import를 사용 중 (오타, 잘못된 파일). 데코레이터는 스키마 객체를 직접 기록하므로 import 에러는 부팅 시 실패. |
