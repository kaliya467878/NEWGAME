import { notFound } from "next/navigation";
import { format } from "date-fns";
import { getCmsContentById, getCmsVersions } from "@/lib/cms/queries";
import { publishCmsContentAction, archiveCmsContentAction } from "@/lib/actions/cms";
import { requirePermission, hasPermission } from "@/lib/admin/permissions";
import { Button } from "@/components/ui/Button";
import { EditCmsForm } from "../CmsForms";

function toLocalInputValue(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function AdminCmsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("cms.view");
  const canPublish = await hasPermission(staff, "cms.publish");
  const { id } = await params;
  const content = await getCmsContentById(id);
  if (!content) notFound();

  const versions = await getCmsVersions(id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit content</h1>
        <div className="flex gap-2">
          {canPublish && content.status !== "PUBLISHED" && (
            <form action={publishCmsContentAction}>
              <input type="hidden" name="id" value={content.id} />
              <Button type="submit">Publish</Button>
            </form>
          )}
          {canPublish && content.status !== "ARCHIVED" && (
            <form action={archiveCmsContentAction}>
              <input type="hidden" name="id" value={content.id} />
              <Button type="submit" variant="danger">
                Archive
              </Button>
            </form>
          )}
        </div>
      </div>

      <section className="card-surface rounded-2xl p-6">
        <EditCmsForm
          id={content.id}
          defaults={{
            type: content.type,
            title: content.title,
            body: content.body,
            imageUrl: content.imageUrl,
            linkUrl: content.linkUrl,
            sortOrder: content.sortOrder,
            startAt: toLocalInputValue(content.startAt),
            endAt: toLocalInputValue(content.endAt),
          }}
        />
      </section>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Version history</h2>
        <div className="flex flex-col divide-y divide-border">
          {versions.map((v) => (
            <div key={v.id} className="py-3 text-sm">
              <p>
                v{v.version} · <span className="text-gold">{v.status}</span> · by {v.editedBy.displayName}
              </p>
              <p className="text-xs text-muted">{format(new Date(v.createdAt), "d MMM yyyy, h:mm a")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
