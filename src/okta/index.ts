import { ArgSource, ArgSources, Authentication, PostApi, RequiredRole, Workflow, WorkflowContext } from '@dbos-inc/dbos-sdk';
import { AuthMiddleware } from '../auth/middleware';

// --- Secure Workflow ---
@Authentication(AuthMiddleware.authenticate)
export class SecureWorkflow {
  @Workflow()
  @PostApi("/secure-workflow")
  @RequiredRole(['admin'])
  static async secureTask(
    ctx: WorkflowContext,
    @ArgSource(ArgSources.BODY) data: string
  ): Promise<string> {
    ctx.logger.info(`Authenticated user: ${ctx.authenticatedUser}`);
    ctx.logger.info(`Authenticated roles: ${ctx.authenticatedRoles}`);
    return `Data processed for ${ctx.authenticatedUser}: ${data}`;
  }
}