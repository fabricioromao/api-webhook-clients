export class SuccessResponseDto<T = unknown> {
  success = true;
  data: T | unknown = null;
  message: string | null = null;

  constructor(response: { data?: T | unknown; message?: string }) {
    Object.assign(this, response);
  }
}
