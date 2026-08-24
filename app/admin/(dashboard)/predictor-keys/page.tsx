import { format } from "date-fns";
import { requirePermission } from "@/lib/admin/permissions";
import { listPredictorKeys } from "@/lib/actions/predictor";
import { createPredictorKeyAction, togglePredictorKeyAction, deletePredictorKeyAction } from "@/lib/actions/predictor";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

export default async function AdminPredictorKeysPage() {
  // Require staff.manage permission
  await requirePermission("staff.manage");
  
  // List keys from database
  const keys = await listPredictorKeys();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Predictor Access Keys</h1>

      {/* Create Key Card */}
      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4 text-gold">Issue New Predictor Key</h2>
        <form action={createPredictorKeyAction} className="flex flex-col gap-4 max-w-md">
          <TextField 
            label="User Name / Purpose (e.g. Test Account)" 
            name="description" 
            placeholder="Assignee description" 
            required 
          />
          <div>
            <Button type="submit">
              Generate Secure Key
            </Button>
          </div>
        </form>
      </section>

      {/* Keys List Section */}
      <section className="flex flex-col gap-6">
        <h2 className="font-semibold text-lg">Active Predictor Credentials ({keys.length})</h2>
        {keys.length === 0 ? (
          <div className="card-surface rounded-2xl p-8 text-center">
            <p className="text-muted text-sm">No predictor access keys generated yet.</p>
          </div>
        ) : (
          <div className="card-surface rounded-2xl overflow-hidden border border-border bg-surface-1">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead className="bg-surface-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4">Access Key</th>
                    <th className="px-6 py-4">Assignee</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Issued Date</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gold tracking-wider">
                        {k.key}
                      </td>
                      <td className="px-6 py-4 text-foreground font-medium">
                        {k.description}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${k.isActive ? "bg-green/10 text-green border border-green/30" : "bg-red/10 text-red border border-red/30"}`}>
                          {k.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted text-xs">
                        {format(new Date(k.createdAt), "d MMM yyyy, h:mm a")}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {/* Toggle Status Action */}
                        <form action={togglePredictorKeyAction}>
                          <input type="hidden" name="id" value={k.id} />
                          <button 
                            type="submit" 
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition ${k.isActive ? "bg-red/10 border-red/40 text-red hover:bg-red/20" : "bg-green/10 border-green/40 text-green hover:bg-green/20"}`}
                          >
                            {k.isActive ? "Suspend" : "Activate"}
                          </button>
                        </form>

                        {/* Delete Action */}
                        <form 
                          action={deletePredictorKeyAction}
                          onSubmit={(e) => {
                            if (!confirm("Are you sure you want to permanently delete this predictor access key?")) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="id" value={k.id} />
                          <button 
                            type="submit" 
                            className="rounded-lg bg-surface border border-border text-muted hover:text-red hover:border-red/40 px-3 py-1.5 text-xs font-semibold transition"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
