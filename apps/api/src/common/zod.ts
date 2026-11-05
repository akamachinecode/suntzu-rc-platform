import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { SchemaObject } from "@nestjs/swagger";
import { z } from "zod";

/** Validates a request body/query with a Zod schema from @workspace/shared: `@Body(new ZodPipe(schema))`. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Invalid input",
        errors: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}

/** Converts a Zod schema to an OpenAPI schema for @ApiBody / @ApiOkResponse. */
export function openApi(schema: z.ZodType, io: "input" | "output" = "output"): SchemaObject {
  const json: Record<string, unknown> = z.toJSONSchema(schema, { target: "openapi-3.0", io });
  delete json.$schema;
  return json as SchemaObject;
}
