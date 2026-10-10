import { appendFileSync } from "node:fs";

export default class ConcurrencyReporter {
  write(event) {
    appendFileSync(
      process.env.KK_CONC_EVENTS,
      JSON.stringify({
        capturedAt: new Date().toISOString(),
        ...event,
      }) + "\n",
    );
  }
  onTestBegin(test, result) {
    this.write({
      event: "testBegin",
      id: test.id,
      title: test.titlePath(),
      location: test.location,
      workerIndex: result.workerIndex,
      retry: result.retry,
    });
  }
  onStepBegin(test, result, step) {
    this.write({
      event: "stepBegin",
      id: test.id,
      workerIndex: result.workerIndex,
      retry: result.retry,
      category: step.category,
      title: step.title,
      location: step.location,
    });
  }
  onStepEnd(test, result, step) {
    this.write({
      event: "stepEnd",
      id: test.id,
      workerIndex: result.workerIndex,
      retry: result.retry,
      category: step.category,
      title: step.title,
      duration: step.duration,
      error: step.error,
    });
  }
  onTestEnd(test, result) {
    this.write({
      event: "testEnd",
      id: test.id,
      workerIndex: result.workerIndex,
      retry: result.retry,
      status: result.status,
      duration: result.duration,
      errors: result.errors,
    });
  }
  onError(error) {
    this.write({ event: "runnerError", error });
  }
}
