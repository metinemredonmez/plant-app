import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

const UNEXPECTED = 'Beklenmeyen bir hata oluştu';

/**
 * Every error leaves the API as `{message}`: the only error shape the app
 * reads (`err.response.data.message`). The new app's routes may add a
 * machine-readable `code` (e.g. `quota_exceeded`, `consent_required`). Unexpected errors are logged and
 * answered with a generic message so internals never reach the client.
 */
@Catch()
export class LegacyErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(LegacyErrorFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!isHttp) {
      this.logger.error(exception);
    }
    const message = isHttp ? messageOf(exception) : UNEXPECTED;
    const code = isHttp ? codeOf(exception) : undefined;
    this.adapterHost.httpAdapter.reply(
      host.switchToHttp().getResponse(),
      code ? { message, code } : { message },
      status,
    );
  }
}

function messageOf(exception: HttpException): string {
  const body = exception.getResponse();
  const message =
    typeof body === 'string' ? body : (body as { message?: unknown }).message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' ? message : exception.message;
}

/** `new HttpException({ message, code }, status)` → `code`. */
function codeOf(exception: HttpException): string | undefined {
  const body = exception.getResponse();
  const code =
    typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : undefined;
}
