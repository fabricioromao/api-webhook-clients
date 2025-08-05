export class ErrorResponseDto {
  success = false;
  message: string = 'Erro interno no servidor';

  constructor(error: { message: string; statusCode?: number }) {
    Object.assign(this, error);
  }
}
