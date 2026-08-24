import { format } from "date-fns";
import { getGiftCodes } from "@/lib/admin/queries";
import { toggleGiftCodeActiveAction } from "@/lib/actions/admin";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CreateGiftCodeForm, BroadcastEventForm } from "./GiftCodeAdminForms";

export default async function AdminGiftCodesPage() {
  const staff = await requirePermission("giftcodes.view");
  const canManage = await hasPermission(staff, "giftcodes.manage");
  const giftCodes = await getGiftCodes();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Gift codes &amp; event rewards</h1>

      {canManage && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Create gift code</h2>
          <CreateGiftCodeForm />
        </section>
      )}

      {canManage && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Broadcast event reward</h2>
          <p className="text-sm text-muted mb-4">
            Sends a claimable Event reward card to every user's Rewards Center.
          </p>
          <BroadcastEventForm />
        </section>
      )}

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Gift codes</h2>
        {giftCodes.length === 0 ? (
          <p className="text-sm text-muted">No gift codes yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {giftCodes.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-mono text-gold">{g.code}</p>
                  <p className="text-xs text-muted">
                    {formatAmount(g.amount)} · {g.redeemedCount}/{g.maxRedemptions} redeemed
                    {g.expiresAt ? ` · expires ${format(new Date(g.expiresAt), "d MMM yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "text-xs font-semibold px-2.5 py-1 rounded-full border " +
                      (g.isActive ? "border-green/40 text-green bg-green/10" : "border-muted/40 text-muted bg-surface-2")
                    }
                  >
                    {g.isActive ? "Active" : "Inactive"}
                  </span>
                  {canManage && (
                    <form action={toggleGiftCodeActiveAction}>
                      <input type="hidden" name="id" value={g.id} />
                      <Button type="submit" variant="secondary" className="text-xs px-3 py-1.5">
                        {g.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
