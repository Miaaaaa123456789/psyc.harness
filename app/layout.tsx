import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "精神专科AI医院 · 运行工作台",
  description: "机器人持续读取医院运行数据，通过可装配 Skill 完成信息整理、异常发现、任务生成与跨部门协作；工作人员只在需要确认、判断与风险处置的节点介入。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
