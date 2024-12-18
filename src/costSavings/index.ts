import { GetApi, Step, StepContext } from "@dbos-inc/dbos-sdk";

export class ExternalApiCommunication {
  /**
   * @param ctxt
   */
  @GetApi("/passthrough")
  @Step()
  static async communicateWithExternalApi(ctxt: StepContext) {
    return await fetch("https://httpstat.us/200?sleep=5000");
  }
}

class DemoSleepEndpoint {
  @GetApi("/sleep")
  @Step()
  static async sleepEndpoint(ctxt: StepContext): Promise<{ message: string }> {
    // Wait for 5 seconds using a Promise-based delay
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Return the response
    return { message: "Waited for 5 seconds and returned successfully!" };
  }
}