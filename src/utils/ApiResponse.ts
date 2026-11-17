export class ApiResponse<T> {
  public readonly success = true;
  public readonly message: string;
  public readonly data: T;

  constructor(data: T, message = 'Success') {
    this.message = message;
    this.data = data;
  }
}
