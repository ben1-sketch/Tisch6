import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/ActionForm";
import { Card, Chip, Empty, Notice, PageTitle, field } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { type Restaurant, db } from "@/lib/db";
import { WEEKDAY_NAMES, type WeekdayCode } from "@/lib/time";
import { deleteRestaurantAction, restaurantAction } from "../../actions";

export const metadata: Metadata = { title: "Lokale" };

const DAYS: WeekdayCode[] = ["mo", "di", "mi", "do", "fr", "sa", "so"];
const label = "block text-sm";
const caption = "mb-1 block text-mist";

function RestaurantFields({ r }: { r?: Restaurant }) {
  return (
    <div className="grid w-full gap-3 sm:grid-cols-2">
      <label className={label}>
        <span className={caption}>Name</span>
        <input name="name" required defaultValue={r?.name} className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Adresse (erst nach der Zusage sichtbar)</span>
        <input name="address" required defaultValue={r?.address} placeholder="Neubaugasse 1, 1070 Wien" className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Bezirk (steht schon in der Einladung)</span>
        <input name="district" defaultValue={r?.district ?? ""} placeholder="7. Neubau" className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>E-Mail für Reservierungen</span>
        <input name="email" type="email" defaultValue={r?.email ?? ""} placeholder="leer = an ADMIN_EMAIL" className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Telefon</span>
        <input name="phone" defaultValue={r?.phone ?? ""} className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Karten-Link (optional)</span>
        <input name="maps_url" defaultValue={r?.maps_url ?? ""} placeholder="https://maps.app.goo.gl/…" className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Beginn</span>
        <input name="start_time" type="time" required defaultValue={(r?.start_time ?? "19:00").slice(0, 5)} className={`${field} w-full`} />
      </label>
      <label className={label}>
        <span className={caption}>Sechsertische pro Abend</span>
        <input name="tables_per_evening" type="number" min={1} max={10} required defaultValue={r?.tables_per_evening ?? 1} className={`${field} w-full`} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className={`${caption} text-sm`}>An diesen Tagen kann das Lokal einen Sechsertisch freihalten</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {DAYS.map((d) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="weekdays" value={d} defaultChecked={r ? r.weekdays.includes(d) : true} className="h-4 w-4 accent-gold-400" />
              {WEEKDAY_NAMES[d]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className={`${label} sm:col-span-2`}>
        <span className={caption}>Notiz (intern)</span>
        <textarea name="notes" rows={2} maxLength={1000} defaultValue={r?.notes ?? ""} placeholder="Ansprechperson, Absprachen …" className={`${field} w-full`} />
      </label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="h-4 w-4 accent-gold-400" />
        Aktiv – die KI plant neue Tische hier ein
      </label>
    </div>
  );
}

export default async function RestaurantsPage() {
  await requireAdmin();
  const { data, error } = await db().from("restaurants").select("*").order("created_at");
  const rows = (data ?? []) as Restaurant[];

  return (
    <>
      <PageTitle title="Lokale" sub="Vier bis fünf Partnerlokale, die einen Sechsertisch auf „Tisch6“ reservieren und die Rechnung durch sechs teilen. Die KI wechselt sie ab und legt Termine nur an den angehakten Tagen an." />
      {error && <Notice tone="red">Datenbank: {error.message}</Notice>}

      <div className="space-y-4">
        {rows.length === 0 && <Empty>Noch kein Lokal – ohne Lokal kann die KI keinen Termin festlegen.</Empty>}
        {rows.map((r) => (
          <Card
            key={r.id}
            title={r.name}
            aside={
              <span className="flex flex-wrap gap-2">
                <Chip tone={r.active ? "green" : "mist"}>{r.active ? "aktiv" : "pausiert"}</Chip>
                <Chip>{r.start_time.slice(0, 5)} Uhr</Chip>
              </span>
            }
          >
            <p className="text-sm text-mist">
              {r.address}
              {r.district ? ` · ${r.district}` : ""} · {r.weekdays.length === 7 ? "täglich" : DAYS.filter((d) => r.weekdays.includes(d)).map((d) => WEEKDAY_NAMES[d].slice(0, 2)).join(", ")} ·{" "}
              {r.tables_per_evening} {r.tables_per_evening === 1 ? "Tisch" : "Tische"} pro Abend
            </p>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gold-300">Bearbeiten</summary>
              <ActionForm action={restaurantAction} hidden={{ id: r.id }} submit="Speichern" tone="primary" className="mt-4">
                <RestaurantFields r={r} />
              </ActionForm>
              <ActionForm
                action={deleteRestaurantAction}
                hidden={{ id: r.id }}
                submit="Lokal löschen"
                tone="danger"
                confirm={`${r.name} löschen? Geht nur, solange dort noch kein Tisch geplant war.`}
                className="mt-4 border-t border-white/5 pt-4"
              />
            </details>
          </Card>
        ))}

        <Card title="Neues Lokal">
          <ActionForm action={restaurantAction} submit="Lokal anlegen" tone="primary" resetOnSuccess>
            <RestaurantFields />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
