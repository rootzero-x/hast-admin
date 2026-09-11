/**
 * The payment queue.
 *
 * Approving one starts a subscription or a boost; rejecting one tells somebody
 * who has moved real money that it was refused. Both are confirmed before they
 * happen, and the rejection insists on a reason, because "no" with no
 * explanation is how a paying customer becomes an angry one.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api, fetchBlobUrl } from '../api';
import { Screen } from '../App';
import type { Payment } from '../types';
import { Button, Cell, Dialog, Empty, Loading, Row, Table, Tag, money, useToast, when } from '../ui';

const FILTERS: { value: string; label: string }[] = [
  { value: 'submitted', label: 'Tekshiruvda' },
  { value: 'paid', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Rad etilgan' },
  { value: 'any', label: 'Hammasi' },
];

function statusTag(status: string) {
  switch (status) {
    case 'submitted':
      return <Tag tone="warn">Tekshiruvda</Tag>;
    case 'paid':
      return <Tag tone="go">Toʻlangan</Tag>;
    case 'rejected':
      return <Tag tone="danger">Rad etilgan</Tag>;
    case 'failed':
      return <Tag tone="flat">Bekor qilingan</Tag>;
    default:
      return <Tag tone="flat">Kutilmoqda</Tag>;
  }
}

export function Payments({ can }: { can: (permission: string) => boolean }) {
  const [status, setStatus] = useState('submitted');
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [deciding, setDeciding] = useState<{ payment: Payment; approve: boolean } | null>(null);
  const [receipt, setReceipt] = useState<{ payment: Payment; url: string } | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setRows(null);

    api<Payment[]>('/admin/payments', { query: { status } })
      .then(({ data }) => setRows(data))
      .catch((e) => {
        setRows([]);
        toast(e instanceof ApiError ? e.message : 'Yuklab boʻlmadi', true);
      });
  }, [status, toast]);

  useEffect(load, [load]);

  const openReceipt = async (payment: Payment) => {
    if (!payment.receipt_url) return;

    try {
      const url = await fetchBlobUrl(payment.receipt_url.replace('/api/v1', ''));
      setReceipt({ payment, url });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Chekni ochib boʻlmadi', true);
    }
  };

  return (
    <Screen
      title="Toʻlovlar"
      actions={
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto font-sans">
          {FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      }
    >
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Navbat boʻsh — hammasi koʻrib chiqilgan</Empty>
      ) : (
        <Table head={['Havola', 'Kim', 'Nima uchun', 'Summa', 'Yuborildi', 'Holat', '']}>
          {rows.map((payment) => (
            <Row key={payment.id}>
              <Cell>
                <span className="font-mono text-xs">{payment.reference}</span>
              </Cell>
              <Cell>
                <div>{payment.user.name ?? '—'}</div>
                <div className="text-ink-faint">{payment.user.phone ?? payment.user.email ?? ''}</div>
              </Cell>
              <Cell>
                {payment.purpose === 'subscription'
                  ? `Obuna — ${payment.plan_name ?? ''}`
                  : `Top koʻtarish — ${payment.subject ?? ''}`}
              </Cell>
              <Cell numeric>{money(payment.amount_uzs)}</Cell>
              <Cell className="text-ink-faint">{when(payment.submitted_at)}</Cell>
              <Cell>{statusTag(payment.status)}</Cell>
              <Cell>
                <div className="flex flex-wrap gap-2">
                  {payment.receipt_url && (
                    <Button tone="quiet" small onClick={() => void openReceipt(payment)}>
                      Chek
                    </Button>
                  )}
                  {can('payments.review') && ['created', 'pending', 'submitted'].includes(payment.status) && (
                    <>
                      <Button small onClick={() => setDeciding({ payment, approve: true })}>
                        Tasdiqlash
                      </Button>
                      <Button tone="danger" small onClick={() => setDeciding({ payment, approve: false })}>
                        Rad etish
                      </Button>
                    </>
                  )}
                </div>
              </Cell>
            </Row>
          ))}
        </Table>
      )}

      {receipt && (
        <Dialog
          title={`${receipt.payment.reference} — chek`}
          onClose={() => {
            // The blob is revoked on close: a receipt carries a card number and
            // has no business lingering in memory once it has been looked at.
            URL.revokeObjectURL(receipt.url);
            setReceipt(null);
          }}
        >
          <img src={receipt.url} alt="Chek" className="w-full rounded-soft-sm shadow-raise-sm" />
        </Dialog>
      )}

      {deciding && (
        <Decide
          payment={deciding.payment}
          approve={deciding.approve}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            load();
          }}
        />
      )}
    </Screen>
  );
}

function Decide({
  payment,
  approve,
  onClose,
  onDone,
}: {
  payment: Payment;
  approve: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const run = async () => {
    if (!approve && !note.trim()) {
      toast('Sabab yozing', true);
      return;
    }

    setBusy(true);

    try {
      await api(`/admin/payments/${payment.id}/${approve ? 'approve' : 'reject'}`, {
        method: 'POST',
        body: { note: note.trim() },
      });

      toast(approve ? 'Tasdiqlandi' : 'Rad etildi');
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Bajarilmadi', true);
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={approve ? 'Toʻlovni tasdiqlash' : 'Toʻlovni rad etish'}
      onClose={onClose}
      actions={
        <Button tone={approve ? 'go' : 'danger'} small busy={busy} onClick={() => void run()}>
          {approve ? 'Tasdiqlash' : 'Rad etish'}
        </Button>
      }
    >
      <p className="mb-3 text-[13px] text-ink-muted">
        {approve
          ? 'Obuna yoki koʻtarish darhol faollashadi. Bu amalni orqaga qaytarib boʻlmaydi.'
          : 'Foydalanuvchiga sabab bilan xabar boradi.'}
      </p>
      <p className="mb-4 text-[13px]">
        <b>{payment.user.name}</b> · {money(payment.amount_uzs)} · {payment.reference}
      </p>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={approve ? 'Izoh (ixtiyoriy)' : 'Sabab — foydalanuvchiga shu matn boradi'}
        className="field min-h-24 resize-y font-mono"
      />
    </Dialog>
  );
}
