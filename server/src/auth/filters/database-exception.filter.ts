import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Maps PostgreSQL driver error codes to clean HTTP responses. */
@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const driverError = exception.driverError as { code?: string };

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected database error occurred';

    switch (driverError?.code) {
      case '23505':
        statusCode = HttpStatus.CONFLICT;
        message = 'Duplicate entry — a record with these values already exists';
        break;
      case '23503':
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference — the related record does not exist';
        break;
      case '23502':
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing — cannot store NULL here';
        break;
      case '22P02':
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid input format — incorrect data type';
        break;
      case '23514':
        statusCode = HttpStatus.BAD_REQUEST;
        message = 'Invalid value — check constraint violated';
        break;
      default:
        break;
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      error: 'Database Error',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
