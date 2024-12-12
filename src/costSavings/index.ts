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