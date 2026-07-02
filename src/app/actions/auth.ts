"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authenticate, createSession, destroySession } from "@/lib/auth";
import { rateLimit, rateLimitReset, clientIpFrom } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";

// 10 attempts per 5 minutes per IP+account — slows brute force without
// locking out a fat-fingered analyst.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 5 * 60_000;

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const ip = clientIpFrom(await headers());
  const bucket = `login:${ip}:${email.toLowerCase()}`;
  const rl = rateLimit(bucket, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!rl.ok) {
    await prisma.activity.create({
      data: {
        verb: "throttled",
        entity: "User",
        summary: `Login rate limit hit for ${email} from ${ip}.`,
      },
    });
    return {
      error: `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} minute(s).`,
    };
  }

  const user = await authenticate(email, password);
  if (!user) return { error: "Invalid credentials or inactive account." };

  rateLimitReset(bucket);
  await createSession(user);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
