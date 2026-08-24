import { format } from "date-fns";
import { requirePermission, PERMISSION_CATALOG } from "@/lib/admin/permissions";
import { getStaffAccounts } from "@/lib/admin/queries";
import { CreateStaffForm, StaffPermissionsForm } from "./StaffForms";
import { DeleteStaffButton } from "./DeleteStaffButton";

const CATALOG = PERMISSION_CATALOG.map((p) => ({ key: p.key, label: p.label, area: p.area }));

export default async function AdminStaffPage() {
  await requirePermission("staff.manage");
  const staff = await getStaffAccounts();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Staff management</h1>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Create staff account</h2>
        <CreateStaffForm />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="font-semibold">Staff accounts ({staff.length})</h2>
        {staff.length === 0 ? (
          <p className="text-sm text-muted">No staff accounts yet.</p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">{s.displayName}</p>
                  <p className="text-xs text-muted">
                    {s.phone}
                    {s.email ? ` · ${s.email}` : ""} · created {format(new Date(s.createdAt), "d MMM yyyy")}
                  </p>
                </div>
                <span className="text-xs text-muted">{s.staffPermissions.length} permissions</span>
              </div>
              <StaffPermissionsForm
                userId={s.id}
                displayName={s.displayName}
                currentKeys={s.staffPermissions.map((p) => p.key)}
                catalog={CATALOG}
              />
              <DeleteStaffButton userId={s.id} displayName={s.displayName} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
