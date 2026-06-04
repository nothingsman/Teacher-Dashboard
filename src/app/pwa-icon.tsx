import { ImageResponse } from "next/og";

type TeacherIconOptions = {
  size: 192 | 512;
  maskable?: boolean;
};

export function createTeacherPwaIcon({ size, maskable = false }: TeacherIconOptions) {
  const padding = maskable ? Math.round(size * 0.12) : Math.round(size * 0.1);
  const borderRadius = Math.round(size * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1A237E 0%, #283593 100%)",
          color: "#E8EAF6",
          fontFamily: "Arial, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: padding,
            borderRadius,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(232, 234, 246, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={Math.round(size * 0.62)}
            height={Math.round(size * 0.62)}
            viewBox="0 0 64 64"
            fill="none"
          >
            <rect width="64" height="64" rx="12" fill="#1A237E" />
            <path d="M32 14L10 26l22 12 22-12-22-12z" fill="#E8EAF6" />
            <path d="M10 26v12l22 12 22-12V26" fill="none" stroke="#C5CAE9" strokeWidth="2" />
            <path d="M22 30l10 5.5L42 30" fill="none" stroke="#C5CAE9" strokeWidth="2" />
            <path d="M45 28v8c0 2-5.5 4-13 4s-13-2-13-4v-8" fill="none" stroke="#C5CAE9" strokeWidth="2" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  );
}
