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
    await ctxt.client("products").insert(product).onConflict("title").merge({
      description: product.description,
      cost: product.cost,
    });
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
    return products.map((product) => {
      return {
        title: product.title,
        description: product.description,
        cost: product.cost,
      };
    });
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
   * The following workflow is very simple. All we're doing is fetching some product data from
   * an external system, inserting that data into our DBOS database, and finally getting a list
   * of all products.
   *
   *
   * @param ctxt
   */
  @Workflow()
  @GetApi("/products")
  static async GetProductsWorkflow(ctxt: WorkflowContext) {
    const externalProduct = await ctxt
      .invoke(DbosBasics)
      .fetchExternalProduct();

    await ctxt.invoke(DbosBasics).insertProduct(externalProduct);

    const products = await ctxt.invoke(DbosBasics).getProducts();

    return products;
  }
}
