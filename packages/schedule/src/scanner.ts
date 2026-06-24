/**
 * Scanner bridge — connects the Application's provider scanner with the
 * ScheduleService. Lives in its own file to avoid circular imports
 * between schedule.module.ts and schedule.service.ts.
 */
import type { ScheduleService } from "./schedule.service.js";

let _scheduleService: ScheduleService | null = null;

/** @internal Set by ScheduleService constructor. */
export function __setScheduleService(svc: ScheduleService | null): void {
	_scheduleService = svc;
}

/** @internal Called by Application.bootstrap() for each resolved provider. */
export function scanProviderForSchedules(instance: unknown): void {
	const svc = _scheduleService;
	if (!svc) return;
	const ctor = (instance as any)?.constructor;
	if (!ctor) return;
	const hasCron = Reflect.getMetadata("nexus:schedule:cron", ctor);
	const hasInterval = Reflect.getMetadata("nexus:schedule:interval", ctor);
	const hasTimeout = Reflect.getMetadata("nexus:schedule:timeout", ctor);
	if (hasCron || hasInterval || hasTimeout) {
		svc.scanInstance(instance as object);
	}
}
