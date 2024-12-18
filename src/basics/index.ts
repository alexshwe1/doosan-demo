import {
  ArgRequired,
  ArgSource,
  ArgSources,
  GetApi,
  PostApi,
  Step,
  StepContext,
  Transaction,
  TransactionContext,
  Workflow,
  WorkflowContext,
} from "@dbos-inc/dbos-sdk";
import { Knex } from "knex";

let RETRY_COUNT = 0;

interface ProductRecord {
  title: string;
  description: string;
  cost: number;
}

export class DbosBasics {
  /**
   * Use transaction functions to read and write from your database. A transaction function
   * may contain multiple queries as well as TypeScript business logic and executes as a
   * single database transaction.
   *
   * @param ctxt
   * @param product
   */
  @PostApi("/product")
  @Transaction()
  static async insertProduct(
    ctxt: TransactionContext<Knex>,
    product: ProductRecord
  ) {
    await ctxt.client("products").insert(product);
  }

  /**
   * Read transactions should be decorated with @Transaction({readOnly: true}) for
   * faster performance
   *
   * @param ctxt
   */
  @Transaction({ readOnly: true })
  static async getProducts(
    ctxt: TransactionContext<Knex>
  ): Promise<ProductRecord[]> {
    const products = await ctxt.client<ProductRecord>("products").select("*");
    return products;
  }

  /**
   * Along with transactions, steps are functions used to build reliable workflows.
   * A step is just a function, but when executed to completion, the result of the
   * step will be stored durably in the DBOS system database, so that retried workflows
   * will skip the step and use the stored output.
   *
   * You can specify fine-grained configuration information like the the wait time between
   * retries, the max number of retries, and the backoff rate between retries.
   *
   * @param ctxt
   */
  @Step()
  static async fetchExternalProduct(ctxt: StepContext) {
    const response = await fetch("https://fakestoreapi.com/products/3");
    const product = await response.json();
    return {
      title: product.title,
      description: product.description,
      cost: product.price.toString(),
    };
  }

  /**
   * Workflows orchestrate the execution of other functions, like transactions and steps.
   * Workflows are reliable: if their execution is interrupted for any reason (e.g., an
   * executor is restarted or crashes), DBOS automatically resumes them from where they
   * left off, running them to completion without re-executing any operation that already
   * finished. You can use workflows to coordinate multiple operations that must all complete
   * for a program to be correct.
   *
   * Workflows in DBOS are conceptually similar to AWS Step Functions, as both are orchestration
   * tools designed to manage and execute complex, multi-step processes. However, DBOS workflows
   * go a step further by building reliability into the core of their functionality, saving
   * developers from having to implement and manage complex retry logic manually.
   *
   * The following workflow is very simple - but it illustrates the simplicity of DBOS. In the
   * workflow, we want to reserve a product and then process the payment. If for some reason,
   * the payment is unsuccessful, we want to undo the reservation. Similarly, if the payment
   * step fails, we want to retry from that point onwards (since we don't want to reserve
   * a second ticket).
   *
   * @param ctxt
   */
  @PostApi("/reserve")
  @Workflow()
  static async checkoutWorkflow(
    ctxt: WorkflowContext,
    @ArgRequired @ArgSource(ArgSources.QUERY) paymentResponseCode: number
  ) {
    // Invoke a transaction to reserve the ticket
    const reserved = await ctxt.invoke(DbosBasics).reserveTicket();

    // If the ticket can't be reserved, return failure
    if (!reserved) {
      return false;
    }

    // Invoke a step to pay for the ticket
    const processPayment = await ctxt
      .invoke(DbosBasics)
      .processPayment(paymentResponseCode);

    if (processPayment.success) {
      return true;
    } else {
      // If the payment didn't go through, invoke a transaction to undo the reservation and return failure
      await ctxt.invoke(DbosBasics).undoReserveTicket();
      return false;
    }
  }

  @Transaction()
  static async reserveTicket(ctxt: TransactionContext<Knex>): Promise<boolean> {
    // Decrement ticket count atomically
    const result = await ctxt
      .client<ProductRecord>("tickets")
      .where("id", 1)
      .where("count", ">", 0)
      .decrement("count", 1);

    return result > 0; // If no rows were updated, reservation failed
  }

  @Transaction()
  static async undoReserveTicket(
    ctxt: TransactionContext<Knex>
  ): Promise<void> {
    // Increment ticket count atomically
    await ctxt
      .client<ProductRecord>("tickets")
      .where("id", 1)
      .increment("count", 1);
  }

  @Step()
  static async processPayment(ctxt: StepContext, paymentResponseCode: number) {
    // Check if this is a retry attempt. For demo purposes, we force the response code to 200 after an initial failure with 500.
    // This simulates resolving the issue on a retry attempt.
    if (RETRY_COUNT > 0) {
      paymentResponseCode = 200; // Override to ensure success on retry
    }

    // Perform a simulated payment request to the specified URL
    const response: Response = await fetch(
      `https://httpstat.us/${paymentResponseCode}`
    );

    // Handle a successful payment scenario
    if (response.status === 200) {
      // For demo purposes only. Reset retry count as the payment was successful
      RETRY_COUNT = 0;
      return {
        success: true,
        message: "Payment processed successfully.", // Informational message for success
      };
    }
    // Handle a server error scenario where a retry is needed
    else if (response.status === 500) {
      // For demo purposes only. Increment retry count to track the number of retries for this workflow
      RETRY_COUNT++;
      // Throw an error to signal DBOS to retry the workflow
      throw new Error("Payment processing error: Simulating server failure");
    }
    // Handle other failure scenarios
    else {
      // Return failure response without retrying for non-500 errors
      return {
        success: false,
        message: `Payment failed with status code: ${response.status}`, // Informational message for failure
      };
    }
  }
}
