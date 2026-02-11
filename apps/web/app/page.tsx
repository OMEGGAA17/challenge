'use client';

import { useMemo, useState } from 'react';
import type { TxSecureRecord } from '@mirfa/types';

function apiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export default function HomePage() {
  const [partyId, setPartyId] = useState('party_123');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify({ amount: 100, currency: 'AED' }, null, 2),
  );
  const [txId, setTxId] = useState('');
  const [record, setRecord] = useState<TxSecureRecord | null>(null);
  const [decrypted, setDecrypted] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const parsedPayload = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(payloadText) as unknown };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [payloadText]);

  async function onEncryptSave() {
    setError(null);
    setDecrypted(null);
    if (!parsedPayload.ok) {
      setError(`Invalid JSON payload: ${parsedPayload.error}`);
      return;
    }
    setBusy('encrypt');
    try {
      const rec = await http<TxSecureRecord>('/tx/encrypt', {
        method: 'POST',
        body: JSON.stringify({ partyId, payload: parsedPayload.value }),
      });
      setRecord(rec);
      setTxId(rec.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onFetch() {
    setError(null);
    setDecrypted(null);
    if (!txId) return;
    setBusy('fetch');
    try {
      const rec = await http<TxSecureRecord>(`/tx/${encodeURIComponent(txId)}`);
      setRecord(rec);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onDecrypt() {
    setError(null);
    if (!txId) return;
    setBusy('decrypt');
    try {
      const out = await http<{ id: string; partyId: string; payload: unknown }>(
        `/tx/${encodeURIComponent(txId)}/decrypt`,
        { method: 'POST', body: '{}' },
      );
      setDecrypted(out.payload);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Secure Transactions - MIRFA INTERN CHALLENGE SOLUTION</h1>
      <p style={{ opacity: 0.9, lineHeight: 1.5 }}>
        Enter a partyId and JSON payload, encrypt & store it, fetch the encrypted record, and decrypt it
        back.
      </p>

      <section style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
        <div style={card()}>
          <label style={label()}>partyId</label>
          <input
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            style={input()}
            placeholder="party_123"
          />

          <div style={{ height: 12 }} />

          <label style={label()}>payload (JSON)</label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            style={textarea(!parsedPayload.ok)}
            rows={10}
          />
          {!parsedPayload.ok && (
            <div style={{ color: '#ffb4b4', marginTop: 8, fontSize: 12 }}>
              JSON parse error: {parsedPayload.error}
            </div>
          )}

          <div style={{ height: 12 }} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onEncryptSave} disabled={busy !== null} style={buttonPrimary()}>
              {busy === 'encrypt' ? 'Encrypting…' : 'Encrypt & Save'}
            </button>
          </div>
        </div>

        <div style={card()}>
          <label style={label()}>tx id</label>
          <input
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
            style={input()}
          />

          <div style={{ height: 12 }} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={onFetch} disabled={!txId || busy !== null} style={button()}>
              {busy === 'fetch' ? 'Fetching…' : 'Fetch'}
            </button>
            <button onClick={onDecrypt} disabled={!txId || busy !== null} style={button()}>
              {busy === 'decrypt' ? 'Decrypting…' : 'Decrypt'}
            </button>
          </div>

          <div style={{ height: 12 }} />

          <label style={label()}>encrypted record</label>
          <pre style={pre()}>
            {record ? JSON.stringify(record, null, 2) : ''}
          </pre>

          <label style={label()}>decrypted payload</label>
          <pre style={pre()}>
            {decrypted ? JSON.stringify(decrypted, null, 2) : ''}
          </pre>
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 16, ...card(), border: '1px solid rgba(255,120,120,0.35)' }}>
          <div style={{ color: '#ffb4b4', fontWeight: 600 }}>Error</div>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{error}</div>
        </div>
      )}

    
    </main>
  );
}

function card(): React.CSSProperties {
  return {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
  };
}

function label(): React.CSSProperties {
  return { display: 'block', fontSize: 12, opacity: 0.85, marginBottom: 6 };
}

function input(): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.25)',
    color: '#e6eaf2',
    outline: 'none',
  };
}

function textarea(isInvalid: boolean): React.CSSProperties {
  return {
    ...input(),
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    border: isInvalid ? '1px solid rgba(255,120,120,0.5)' : '1px solid rgba(255,255,255,0.12)',
  };
}

function button(): React.CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e6eaf2',
    cursor: 'pointer',
  };
}

function buttonPrimary(): React.CSSProperties {
  return {
    ...button(),
    background: 'linear-gradient(135deg, rgba(74,122,255,0.9), rgba(120,90,255,0.9))',
    border: '1px solid rgba(120,140,255,0.55)',
  };
}

function pre(): React.CSSProperties {
  return {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    margin: 0,
  };
}

