import Link from "next/link";
import { getAllCmsContent } from "@/lib/cms/queries";
import { publishCmsContentAction, archiveCmsContentAction } from "@/lib/actions/cms";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { Button } from "@/components/ui/Button";
import { CreateCmsForm } from "./CmsForms";
import { getAdminPathPrefix } from "@/lib/admin/path";

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "border-muted/40 text-muted bg-surface-2",
  PUBLISHED: "border-green/40 text-green bg-green/10",
  ARCHIVED: "border-red/40 text-red bg-red/10",
};

export default async function AdminCmsPage() {
  const staff = await requirePermission("cms.view");
  const canManage = await hasPermission(staff, "cms.manage");
  const canPublish = await hasPermission(staff, "cms.publish");
  const content = await getAllCmsContent();
  const prefix = getAdminPathPrefix();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">CMS</h1>

      {canManage && (
        <section className="card-surface rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Create content</h2>
          <CreateCmsForm />
        </section>
      )}

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">All content</h2>
        {content.length === 0 ? (
          <p className="text-sm text-muted">No content yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {content.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 text-sm gap-3">
                <div>
                  <p className="font-medium">
                    {c.title} <span className="text-xs text-muted">({c.type})</span>
                  </p>
                  <p className="text-xs text-muted">v{c.version} · by {c.createdBy.displayName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_CLASS[c.status]}`}>
                    {c.status}
                  </span>
                  <Link href={`${prefix}/cms/${c.id}`}>
                    <Button variant="secondary" className="text-xs px-3 py-1.5">
                      {canManage ? "Edit" : "View"}
                    </Button>
                  </Link>
                  {canPublish && c.status !== "PUBLISHED" && (
                    <form action={publishCmsContentAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" className="text-xs px-3 py-1.5">
                        Publish
                      </Button>
                    </form>
                  )}
                  {canPublish && c.status !== "ARCHIVED" && (
                    <form action={archiveCmsContentAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <Button type="submit" variant="danger" className="text-xs px-3 py-1.5">
                        Archive
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
