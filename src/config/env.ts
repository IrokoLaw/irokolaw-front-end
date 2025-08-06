import * as z from "zod";

const createEnv = () => {
  const EnvSchema = z.object({
    API_URL: z.string(),
    APP_URL: z.string().optional().default("http://localhost:3000"),
    USER_ID: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    CLERK_API_KEY: z.string().optional(),
    SHARED_DISCUSSION_URL: z.string().optional(),
    SHARED_DISCUSSION_DEFAULT_URL: z.string().optional(),
    ALIA_LLM_URL: z.string(),
    ALIA_API_ACCESS_TOKEN: z.string().optional(),
    MODEL: z.string().optional(),
    TEMPERATURE: z.string().optional(),
    SIMILARITY_THRESHOLD: z.string().optional(),
    TOP_K: z.string().optional(),
  });

  const envVars = {
    API_URL: process.env.NEXT_PUBLIC_API_URL,
    APP_URL: process.env.NEXT_PUBLIC_URL,
    USER_ID: process.env.NEXT_PUBLIC_USER_ID,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    CLERK_API_KEY: process.env.CLERK_SECRET_KEY,
    SHARED_DISCUSSION_URL: process.env.NEXT_PUBLIC_SHARED_DISCUSSION_URL,
    SHARED_DISCUSSION_DEFAULT_URL:
      process.env.NEXT_PUBLIC_SHARED_DISCUSSION_DEFAULT_URL,
    ALIA_LLM_URL: process.env.NEXT_PUBLIC_ALIA_LLM_URL,
    ALIA_API_ACCESS_TOKEN: process.env.NEXT_PUBLIC_ALIA_API_ACCESS_TOKEN,
    MODEL: process.env.NEXT_PUBLIC_MODEL,
    TEMPERATURE: process.env.NEXT_PUBLIC_TEMPERATURE,
    SIMILARITY_THRESHOLD: process.env.NEXT_PUBLIC_SIMILARITY_THRESHOLD,
    TOP_K: process.env.NEXT_PUBLIC_TOP_K,
  };

  const parsedEnv = EnvSchema.safeParse(envVars);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid env provided.
  The following variables are missing or invalid:
  ${Object.entries(parsedEnv.error.flatten().fieldErrors)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n")}
  `
    );
  }

  return parsedEnv.data ?? {};
};

export const env = createEnv();
