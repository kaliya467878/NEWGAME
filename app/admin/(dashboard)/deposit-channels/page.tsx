import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/admin/permissions";
import { ChannelTabs } from "./ChannelTabs";
import { FallbackMessageForm, MaintenanceModeForm } from "./DepositChannelForms";

export default async function DepositChannelsPage() {
  await requirePermission("wallet.approve");

  const [all, setting, maintenanceMode, maintenanceMessage] = await Promise.all([
    prisma.depositChannel.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.setting.findUnique({ where: { key: "depositChannelsFallbackMessage" } }),
    prisma.setting.findUnique({ where: { key: "depositMaintenanceMode" } }),
    prisma.setting.findUnique({ where: { key: "depositMaintenanceMessage" } }),
  ]);

  const channels = all.filter((c) => c.kind === "CHANNEL");
  const methods = all.filter((c) => c.kind === "METHOD");
  const activeCount = all.filter((c) => c.active).length;

  const isMaintenance = maintenanceMode?.value === "true";
  const maintenanceMsg = maintenanceMessage?.value || "Deposit channels are currently in maintenance. Please try again later.";

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Deposit channels</h1>
        <p className="text-sm text-muted mt-1">
          Payment methods and channel list shown on the player deposit page. Deposits are still reviewed and
          approved by staff — these settings only control what players see and pick from.
        </p>
      </div>

      <section className="card-surface rounded-2xl p-6 flex flex-col gap-6">
        <MaintenanceModeForm enabled={isMaintenance} message={maintenanceMsg} />
        <FallbackMessageForm current={setting?.value ?? "Deposit channels are temporarily unavailable. Please try again later or contact support."} />
        <p className="text-xs text-muted">
          Turn off any channel or method individually below. Each item has its own disabled message shown to
          players. {activeCount} active of {all.length} total.
        </p>
      </section>

      <ChannelTabs channels={channels} methods={methods} />
    </div>
  );
}
