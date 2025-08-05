import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { SuccessResponseDto } from '../dto/success-response.dto';

@Injectable()
export class ResponseHandlerService {
  private readonly logger = new Logger(ResponseHandlerService.name);

  async handle({
    method,
    res,
    successMessage,
    successStatus,
  }: {
    res: Response;
    method: () => Promise<any>;
    successStatus?: number;
    successMessage?: string;
  }) {
    try {
      const data = await method();
      res
        .status(successStatus || 200)
        .json(new SuccessResponseDto({ data, message: successMessage }));
    } catch (error) {
      res.status(error.status || 500).json(
        new ErrorResponseDto({
          message: error.message || 'Internal server error',
        }),
      );
    }
  }
}
