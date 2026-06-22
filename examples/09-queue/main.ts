import "reflect-metadata";
import { Application, Controller, Post, Body, Module, Inject, Injectable } from "@nexusts/core";
import { QueueService, QueueModule, OnQueueReady } from "@nexusts/queue";

/**
 * 09-queue — background jobs with the in-memory backend.
 *
 *   POST /jobs/email  { "to": "...", "subject": "..." }
 *
 *   Run: bun main.ts
 */

@Injectable()
class EmailWorker {
  constructor(@Inject(QueueService) private queue: QueueService) {}

  @OnQueueReady()
  register() {
    this.queue.process("send-email", async (data: any) => {
      console.log(`[worker] sending email to ${data.to}: ${data.subject}`);
      await new Promise((r) => setTimeout(r, 100));
      return { status: "completed" as const, returnvalue: { to: data.to } };
    });
  }
}

@Controller("/jobs")
class JobController {
  constructor(@Inject(QueueService) private queue: QueueService) {}

  @Post("/email")
  async enqueueEmail(@Body() body: { to: string; subject: string }) {
    const jobId = await this.queue.add("send-email", body);
    return { jobId, status: "queued" };
  }
}

@Module({
  imports: [QueueModule.forRoot({ backend: "memory" })],
  controllers: [JobController],
  providers: [EmailWorker],
})
class AppModule {}

const app = new Application(AppModule);
const port = Number(process.env.PORT ?? 3000);
await app.listen(port);