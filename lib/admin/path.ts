export function getAdminPathPrefix(): string {
  const envPath = process.env.ADMIN_PANEL_PATH || "/admin";
  return envPath.startsWith("/") ? envPath : `/${envPath}`;
}
