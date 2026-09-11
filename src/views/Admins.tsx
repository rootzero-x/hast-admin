/**
 * Who can get into the panel, and exactly what each of them may do.
 *
 * Invitations share this list with real administrators on purpose. Somebody
 * appointed yesterday who has not signed in yet is still part of the answer to
 * "who can get in?", and leaving them on a separate screen is how a forgotten
 * grant survives for months.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '../api';
import { Screen } from '../App';
import type { Admin, PermissionCatalogue } from '../types';
import { Button, Cell, Dialog, Empty, Loading, Notice, Row, Table, Tag, useToast, when } from '../ui';

export function Admins() {
  const [rows, setRows] = useState<Admin[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [removing, setRemoving] = useState<Admin | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setRows(null);

    api<Admin[]>('/admin/admins')
      .then(({ data }) => setRows(data))
      .catch((e) => {
        setRows([]);
        toast(e instanceof ApiError ? e.message : 'Yuklab boʻlmadi', true);
      });
  }, [toast]);

  useEffect(load, [load]);

  return (
    <Screen
      title="Administratorlar"
      actions={
        <Button small onClick={() => setAdding(true)}>
          Qoʻshish
        </Button>
      }
    >
      <Notice>
        Hisobi boʻlmagan odamni ham qoʻshsangiz boʻladi — taklif saqlanadi va u
        ilovaga birinchi kirganda huquqlar oʻzi beriladi. Ruxsat bermasangiz panel
        ochiladi-yu, hech narsa koʻrinmaydi.
      </Notice>

      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Administrator yoʻq</Empty>
      ) : (
        <Table head={['Kim', 'Rol', '2FA', 'Ruxsatlar', 'Oxirgi kirish', '']}>
          {rows.map((admin) => (
            <Row key={admin.id ?? `invite-${admin.invite_id}`}>
              <Cell>
                <div>{admin.name ?? '—'}</div>
                <div className="text-ink-faint">{admin.email ?? admin.phone ?? ''}</div>
              </Cell>
              <Cell>
                {admin.is_founder ? <Tag tone="go">root</Tag> : <Tag tone="flat">{admin.role}</Tag>}
              </Cell>
              <Cell>
                {admin.pending ? (
                  <Tag tone="warn">Kutilmoqda</Tag>
                ) : admin.two_factor ? (
                  <Tag tone="go">Sozlangan</Tag>
                ) : (
                  <Tag tone="warn">Sozlanmagan</Tag>
                )}
              </Cell>
              <Cell className="text-ink-faint">
                {admin.is_founder ? 'hammasi' : `${admin.permissions.length} ta ruxsat`}
              </Cell>
              <Cell className="text-ink-faint">
                {admin.pending ? 'hali kirmagan' : when(admin.last_seen_at)}
              </Cell>
              <Cell>
                <div className="flex flex-wrap gap-2">
                  {admin.pending ? (
                    <Button tone="danger" small onClick={() => setRemoving(admin)}>
                      Taklifni bekor qilish
                    </Button>
                  ) : (
                    !admin.is_founder && (
                      <>
                        <Button tone="quiet" small onClick={() => setEditing(admin)}>
                          Ruxsatlar
                        </Button>
                        <Button tone="danger" small onClick={() => setRemoving(admin)}>
                          Olib tashlash
                        </Button>
                      </>
                    )
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      )}

      {adding && (
        <AddAdmin
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            load();
          }}
        />
      )}

      {editing && (
        <EditPermissions
          admin={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {removing && (
        <Remove
          admin={removing}
          onClose={() => setRemoving(null)}
          onDone={() => {
            setRemoving(null);
            load();
          }}
        />
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The grant list.
 *
 * Presets exist because nobody wants to tick eleven boxes to create a
 * moderator, and because a preset is a decision somebody has already thought
 * about - which is safer than whatever gets assembled in a hurry.
 */
function Permissions({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [catalogue, setCatalogue] = useState<PermissionCatalogue | null>(null);

  useEffect(() => {
    api<PermissionCatalogue>('/admin/permissions')
      .then(({ data }) => setCatalogue(data))
      .catch(() => setCatalogue(null));
  }, []);

  if (!catalogue) return <Loading />;

  const toggle = (slug: string) =>
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);

  return (
    <div className="grid max-w-[640px] gap-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['read_only', 'Faqat koʻrish'],
            ['moderator', 'Moderator'],
            ['full', 'Hammasi'],
          ] as const
        ).map(([preset, label]) => (
          <Button key={preset} tone="quiet" small onClick={() => onChange(catalogue.presets[preset])}>
            {label}
          </Button>
        ))}
      </div>

      {catalogue.groups.map((group) => (
        <div key={group.group} className="surface-sm p-4">
          <h4 className="mb-2.5 text-[10.5px] font-bold uppercase tracking-widest text-ink-faint">
            {group.group}
          </h4>
          {group.permissions.map((permission) => (
            <label
              key={permission.slug}
              className={`flex cursor-pointer items-start gap-2.5 py-1.5 text-[13px] ${
                permission.sensitive ? 'text-warn' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={value.includes(permission.slug)}
                onChange={() => toggle(permission.slug)}
                className="mt-1 accent-go"
              />
              <span>
                {permission.label}
                {permission.note && (
                  <span className="mt-0.5 block text-[11.5px] text-ink-faint">{permission.note}</span>
                )}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

function AddAdmin({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('moderator');
  const [granted, setGranted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    setBusy(true);

    try {
      const { data } = await api<{ invited?: boolean }>('/admin/admins', {
        method: 'POST',
        body: { email: email.trim(), phone: phone.trim(), role, permissions: granted },
      });

      toast(
        data.invited
          ? 'Taklif saqlandi — u ilovaga kirganda huquq beriladi'
          : 'Qoʻshildi',
      );
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Qoʻshilmadi', true);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Administrator qoʻshish"
      onClose={onClose}
      actions={
        <Button small busy={busy} onClick={() => void submit()}>
          Qoʻshish
        </Button>
      }
    >
      <div className="mb-4 grid items-center gap-3 md:grid-cols-[120px_1fr]">
        <label className="text-[12.5px] text-ink-muted">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="field font-sans" />

        <label className="text-[12.5px] text-ink-muted">yoki telefon</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" className="field font-sans" />

        <label className="text-[12.5px] text-ink-muted">Rol</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="field font-sans">
          <option value="moderator">Moderator</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <div className="max-h-[45vh] overflow-y-auto">
        <Permissions value={granted} onChange={setGranted} />
      </div>
    </Dialog>
  );
}

function EditPermissions({
  admin,
  onClose,
  onDone,
}: {
  admin: Admin;
  onClose: () => void;
  onDone: () => void;
}) {
  const [granted, setGranted] = useState<string[]>(admin.permissions);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    setBusy(true);

    try {
      await api(`/admin/admins/${admin.id}/permissions`, {
        method: 'PATCH',
        body: { permissions: granted },
      });

      toast('Saqlandi');
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Saqlanmadi', true);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={`Ruxsatlar — ${admin.name ?? admin.email ?? ''}`}
      onClose={onClose}
      actions={
        <Button small busy={busy} onClick={() => void submit()}>
          Saqlash
        </Button>
      }
    >
      <p className="mb-3 text-[12.5px] text-ink-muted">
        Cheklash darhol kuchga kiradi — u chiqib qayta kirishini kutish shart emas.
      </p>
      <div className="max-h-[55vh] overflow-y-auto">
        <Permissions value={granted} onChange={setGranted} />
      </div>
    </Dialog>
  );
}

function Remove({
  admin,
  onClose,
  onDone,
}: {
  admin: Admin;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    setBusy(true);

    try {
      if (admin.pending) {
        await api(`/admin/invites/${admin.invite_id}`, { method: 'DELETE' });
        toast('Taklif bekor qilindi');
      } else {
        await api(`/admin/admins/${admin.id}`, { method: 'DELETE' });
        toast('Olib tashlandi');
      }

      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Bajarilmadi', true);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={admin.pending ? 'Taklifni bekor qilish' : 'Administratorni olib tashlash'}
      onClose={onClose}
      actions={
        <Button tone="danger" small busy={busy} onClick={() => void submit()}>
          {admin.pending ? 'Bekor qilish' : 'Olib tashlash'}
        </Button>
      }
    >
      <p className="text-[13px] text-ink-muted">
        {admin.pending
          ? `${admin.email ?? admin.phone} uchun saqlangan taklif oʻchadi. U ilovaga kirsa ham huquq berilmaydi.`
          : `${admin.name ?? admin.email} panelga kira olmaydi va ochiq sessiyalari darhol bekor qilinadi.`}
      </p>
    </Dialog>
  );
}
