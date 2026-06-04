import { createTeacherPwaIcon } from "../pwa-icon";

export const runtime = "edge";

export async function GET() {
  return createTeacherPwaIcon({ size: 512, maskable: true });
}
