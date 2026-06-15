import { SetMetadata } from '@nestjs/common';

export const ApiVersion = (version: string) => SetMetadata('api-version', version);
