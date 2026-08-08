export class BlockSdkError extends Error {
  constructor(
    message,
    code = "BLOCK_SDK_ERROR",
    details = undefined
  ) {
    super(message);

    this.name = "BlockSdkError";
    this.code = code;

    if (details !== undefined) {
      this.details = details;
    }
  }
}
