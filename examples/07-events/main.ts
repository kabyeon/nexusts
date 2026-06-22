import "reflect-metadata";
import {
  Application, Controller, Get, Post, Body, Module, Inject, Injectable, Param,
} from "@kabyeon/nexusjs";
import { EventService, EventsModule, OnEvent } from "@kabyeon/nexusjs/events";

/**
 * 07-events — typed event emitter with wildcards, priorities, guards.
 *
 *   POST /emit/user.created   { ...payload }  → emits "user.created"
 *   GET  /listeners                          → registered event names
 *
 *   Run: bun main.ts
 *   Then: curl -X POST http://localhost:3000/emit/user.created \
 *             -H "Content-Type: application/json" -d '{"id":"42","email":"a@b.com"}'
 */

@Injectable()
class UserListener {
  // Exact match — runs first (lowest priority = first)
  @OnEvent("user.created", { priority: 1 })
  onUserCreated(payload: { id: string; email: string }) {
    console.log(`[priority 1] user.created: ${payload.id}`);
  }

  // Wildcard single-segment — runs after exact match
  @OnEvent("user.*", { priority: 5 })
  onAnyUserEvent(payload: any) {
    console.log(`[priority 5] user.*: ${JSON.stringify(payload)}`);
  }

  // Conditional listener — only runs if payload.email has '@'
  @OnEvent("user.*", { priority: 10, if: (p: any) => p?.email?.includes("@") })
  onValidEmail(payload: any) {
    console.log(`[priority 10] valid email: ${payload.email}`);
  }
}

@Controller("/")
class EventController {
  constructor(@Inject(EventService) private events: EventService) {}

  @Post("/emit/:type")
  async emit(@Body() body: any, @Param("type") type: string) {
    const event = `${type}.created`;
    const results = await this.events.emit(event, body);
    return { event, fired: results.length };
  }

  @Get("/listeners")
  listeners() {
    return { events: this.events.eventNames() };
  }
}

@Module({
  imports: [EventsModule.forRoot()],
  controllers: [EventController],
  providers: [UserListener],
})
class AppModule {}

const app = new Application(AppModule);
await app.listen(3000);