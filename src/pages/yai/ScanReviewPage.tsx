import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useYai, yaiStore, demoNow } from '../../services/yai/yaiStore';
import { scanSession } from '../../services/yai/scanSession';
import { ocrAdapter, draftFromOcr } from '../../services/yai/ocrAdapter';
import { field } from '../../data/yai/fixtures';
import { EvidenceField, MedicationPassport } from '../../domain/yai/models';
import { missingFields } from '../../domain/yai/policies';
import { BigButton, Card, Field, inputCls, Notice, PageTitle, SourceChip } from '../../components/yai/ui';
import { CompletenessGrid } from '../../components/yai/CompletenessGrid';
import { FORM_LABEL } from '../../components/yai/labels';
import { OCR_STATUS_TH } from '../../services/yai/thaiOcr';
import { readLabel } from '../../services/yai/ocrPipeline';
import { parsePhotos, draftFromParsed } from '../../services/yai/scanGuidance';

type Step = 'EXTRACT' | 'EDIT' | 'ASK_MISSING' | 'ONLY_THIS';

const ONLY_THIS_REASONS = ['ฉลากหลุด', 'ไม่มีซอง', 'จำชื่อไม่ได้', 'ถ่ายต่อไม่สะดวก', 'ยาต้ม/ยาแบ่งถุง'];

export const ScanReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const state = useYai((s) => s);
  const photoIds = useMemo(() => scanSession.get(), []);
  const photos = state.photos.filter((p) => photoIds.includes(p.id));
  const [step, setStep] = useState<Step>(params.get('onlyThis') ? 'ONLY_THIS' : 'EXTRACT');
  const [draft, setDraft] = useState<MedicationPassport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useText, setUseText] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  const reporter = state.settings.role === 'CAREGIVER' ? 'CAREGIVER_VOICE' : 'PATIENT_VOICE';
  const newId = () => `med-${Date.now().toString(36)}`;

  const readable = photos.filter((p) => p.ocr?.status === 'DONE');
  const unread = photos.filter((p) => p.ocr?.status !== 'DONE');
  const rawText = readable.map((p) => (p.ocr!.editedText ?? p.ocr!.text).trim()).filter(Boolean).join('\n---\n');
  const [ocrStatus, setOcrStatus] = useState('');

  const useRealOcr = () => {
    const parsed = parsePhotos(readable);
    if (!parsed) return;
    setDraft(draftFromParsed(parsed, state.patient.id, photoIds, demoNow().toISOString(), newId()));
    setStep('EDIT');
  };

  const readUnread = async () => {
    setLoading(true);
    setError('');
    let failedCount = 0;
    for (const p of unread) {
      try {
        const res = await readLabel(p.dataUrl, {
          thorough: false,
          allowCloud: state.settings.cloudOcrConsent === true,
          onProgress: (progress, status) => setOcrStatus(`${OCR_STATUS_TH[status] ?? 'กำลังอ่าน'} ${Math.round(progress * 100)}%`),
        });
        yaiStore.setPhotoOcr(p.id, {
          status: 'DONE',
          text: res.text,
          lines: res.lines,
          confidence: res.confidence,
          engine: res.engine,
          at: demoNow().toISOString(),
          provider: res.provider,
          model: res.model,
          preprocess: res.preprocess,
          fallbackReason: res.fallbackReason,
          imageSha256: res.imageSha256,
        });
      } catch {
        failedCount++;
        yaiStore.setPhotoOcr(p.id, { status: 'FAILED', text: '', lines: [], confidence: 0, engine: '', at: demoNow().toISOString() });
      }
    }
    setOcrStatus('');
    setLoading(false);
    if (failedCount) setError('อ่านข้อความไม่สำเร็จ ครั้งแรกต้องต่ออินเทอร์เน็ตเพื่อโหลดระบบอ่านภาษาไทย หรือพิมพ์เองได้ค่ะ');
  };

  const runDemoOcr = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ocrAdapter.extract(photoIds[0] ?? 'none');
      setDraft(draftFromOcr(result, state.patient.id, photoIds, demoNow().toISOString(), newId()));
      setStep('EDIT');
    } catch {
      setError('อ่านข้อมูลไม่สำเร็จ ลองใหม่ หรือพิมพ์เองได้ค่ะ');
    } finally {
      setLoading(false);
    }
  };

  const startManual = () => {
    const now = demoNow().toISOString();
    setDraft({
      id: newId(),
      patientId: state.patient.id,
      version: 1,
      kind: 'UNKNOWN',
      form: field('UNKNOWN', 'MANUAL_ENTRY'),
      displayName: field(null, 'MANUAL_ENTRY'),
      ingredients: [],
      labelStrength: field(null, 'MANUAL_ENTRY'),
      labelDirections: field(null, 'MANUAL_ENTRY'),
      useReports: [],
      registrationNumber: field(null, 'MANUAL_ENTRY'),
      manufacturer: field(null, 'MANUAL_ENTRY'),
      photoIds,
      status: 'DRAFT',
      pendingIdentification: false,
      unresolvedQuestions: [],
      createdAt: now,
      updatedAt: now,
    });
    setStep('EDIT');
  };

  // Editing a value makes it a manual entry; it is no longer the (synthetic) label reading
  const edit = (f: EvidenceField<string>, value: string): EvidenceField<string> => ({
    ...f,
    value: value.trim() ? value : null,
    origin: 'MANUAL_ENTRY',
    isSynthetic: false,
    extractionConfidence: undefined,
    verification: reporter === 'CAREGIVER_VOICE' ? 'CAREGIVER_REPORTED' : 'PATIENT_REPORTED',
  });

  const save = () => {
    if (!draft) return;
    const now = demoNow().toISOString();
    const useReports = useText.trim() ? [{ origin: reporter as 'PATIENT_VOICE' | 'CAREGIVER_VOICE', value: useText.trim(), reportedAt: now }] : [];
    const hasName = !!draft.displayName.value;
    yaiStore.saveMedicine({
      ...draft,
      useReports,
      status: confirmed && hasName ? 'PATIENT_CONFIRMED' : hasName ? 'REQUIRES_CLINICIAN_REVIEW' : 'INSUFFICIENT_INFORMATION',
      pendingIdentification: !hasName,
      unresolvedQuestions: missingFields({ ...draft, useReports }).map((f) => `ยังไม่ทราบ${f}`),
    });
    setStep('ASK_MISSING');
  };

  const saveOnlyThis = () => {
    const text = [reasons.join(', '), description.trim()].filter(Boolean).join(' — ');
    yaiStore.addPendingMedicine(text || 'มีแค่นี้ ไม่มีข้อมูลเพิ่ม', photoIds);
    scanSession.clear();
    navigate('/yai/medicines?saved=pending');
  };

  const finish = () => {
    scanSession.clear();
    navigate('/yai/medicines?saved=1');
  };

  return (
    <div className="space-y-4">
      <PageTitle title="ตรวจข้อมูลยา" back="/yai/scan" />

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p) => (
            <img key={p.id} src={p.dataUrl} alt="รูปยาที่ถ่ายไว้" className="h-28 w-24 shrink-0 rounded-xl object-cover" />
          ))}
        </div>
      )}

      {step === 'EXTRACT' && (
        <Card className="space-y-3">
          {photos.length > 0 ? (
            <>
              <Notice title={`อ่านข้อความจากรูปแล้ว ${readable.length}/${photos.length} รูป`}>
                อ่านในเครื่องนี้ด้วยระบบอ่านภาษาไทย อาจอ่านผิดหรือไม่ครบ ขั้นถัดไปจะให้ตรวจและแก้ทุกช่อง
              </Notice>
              {readable.length > 0 && (
                <BigButton size="lg" onClick={useRealOcr} disabled={loading}>
                  ใช้ข้อความที่อ่านได้จากรูป
                </BigButton>
              )}
              {unread.length > 0 && (
                <BigButton variant={readable.length ? 'secondary' : 'primary'} onClick={readUnread} disabled={loading}>
                  {loading ? ocrStatus || 'กำลังอ่านข้อความ…' : `อ่านข้อความจากรูป (ภาษาไทย) ${unread.length} รูป`}
                </BigButton>
              )}
              {rawText && (
                <details className="rounded-2xl border border-yai-ink/10 p-3">
                  <summary className="min-h-[44px] cursor-pointer text-base font-semibold text-yai-deep">ดูข้อความทั้งหมดที่อ่านได้</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-base">{rawText}</pre>
                </details>
              )}
            </>
          ) : (
            <Notice title="ยังไม่มีรูป">ถ่ายรูปฉลากก่อนเพื่อให้ระบบอ่านข้อความ หรือพิมพ์ชื่อยาเองได้</Notice>
          )}
          <BigButton variant="secondary" onClick={startManual}>
            พิมพ์ชื่อยาเอง
          </BigButton>
          <BigButton variant="ghost" onClick={() => setStep('ONLY_THIS')}>
            มีแค่นี้ — ข้อมูลไม่ครบ
          </BigButton>
          <button type="button" onClick={runDemoOcr} disabled={loading} className="min-h-[44px] w-full text-base font-semibold text-yai-ink/70 underline">
            ใช้ฉลากตัวอย่างสำหรับสาธิต (ไม่ได้อ่านจากรูป)
          </button>
          {error && <Notice tone="alert" title={error} />}
        </Card>
      )}

      {step === 'EDIT' && draft && (
        <>
          <Card className="space-y-4">
            <h2 className="text-xl font-bold">ข้อมูลจากฉลาก</h2>
            <p className="text-base text-yai-ink/75">ตรวจดูและแก้ได้ทุกช่อง ช่องที่ไม่รู้ปล่อยว่างไว้ได้</p>
            <EditableField label="ชื่อยา" f={draft.displayName} onChange={(v) => setDraft({ ...draft, displayName: edit(draft.displayName, v) })} />
            <EditableField
              label="ส่วนประกอบ"
              f={draft.ingredients[0] ?? field<string>(null, 'MANUAL_ENTRY')}
              onChange={(v) => setDraft({ ...draft, ingredients: [edit(draft.ingredients[0] ?? field<string>(null, 'MANUAL_ENTRY'), v)] })}
            />
            <EditableField
              label="ความแรงที่พิมพ์บนฉลาก"
              hint="ตัวเลขบนกล่อง ไม่ใช่ปริมาณที่คุณยายกินจริง"
              f={draft.labelStrength}
              onChange={(v) => setDraft({ ...draft, labelStrength: edit(draft.labelStrength, v) })}
            />
            <EditableField label="วิธีใช้ตามฉลาก" f={draft.labelDirections} onChange={(v) => setDraft({ ...draft, labelDirections: edit(draft.labelDirections, v) })} />
            <div className="space-y-1">
              <Field label="รูปแบบ">
                <select
                  className={inputCls}
                  value={draft.form.value ?? 'UNKNOWN'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      form: { ...draft.form, value: e.target.value as MedicationPassport['form']['value'], origin: 'MANUAL_ENTRY', isSynthetic: false, extractionConfidence: undefined },
                    })
                  }
                >
                  {Object.entries(FORM_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              {draft.form.value && draft.form.value !== 'UNKNOWN' && <SourceChip origin={draft.form.origin} synthetic={draft.form.isSynthetic} confidence={draft.form.extractionConfidence} />}
            </div>
            <EditableField
              label="เลข อย. / เลขทะเบียน"
              hint="ถ้าไม่เห็นบนกล่อง ปล่อยว่างได้ ระบบไม่เดาเลขทะเบียน"
              f={draft.registrationNumber}
              onChange={(v) => setDraft({ ...draft, registrationNumber: edit(draft.registrationNumber, v) })}
            />
            <EditableField
              label="ผู้ผลิต"
              f={draft.manufacturer ?? field<string>(null, 'MANUAL_ENTRY')}
              onChange={(v) => setDraft({ ...draft, manufacturer: edit(draft.manufacturer ?? field<string>(null, 'MANUAL_ENTRY'), v) })}
            />
          </Card>

          <Card>
            <CompletenessGrid medicine={draft} />
          </Card>

          <Card className="space-y-4">
            <h2 className="text-xl font-bold">{reporter === 'CAREGIVER_VOICE' ? 'คุณยายใช้จริงอย่างไร (หลานเล่า)' : 'คุณยายใช้จริงอย่างไร'}</h2>
            <Field label="เล่าสั้นๆ เช่น กินวันละครั้งตอนเช้า" hint="ถ้าไม่ตรงกับฉลาก ไม่เป็นไร ระบบจะเก็บไว้ทั้งสองแบบให้เภสัชกรดู">
              <input className={inputCls} value={useText} onChange={(e) => setUseText(e.target.value)} />
            </Field>
            <label className="flex min-h-[56px] items-center gap-3 text-lg">
              <input type="checkbox" className="h-7 w-7 accent-yai-deep" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              ยืนยันว่าคุณยายใช้ยานี้อยู่
            </label>
            {!draft.displayName.value && <Notice tone="warn" title="ยังไม่มีชื่อยา จะบันทึกเป็นรายการที่รอผู้เชี่ยวชาญช่วยระบุ" />}
            <BigButton size="lg" onClick={save}>
              บันทึกยานี้
            </BigButton>
          </Card>
        </>
      )}

      {step === 'ASK_MISSING' && (
        <Card className="space-y-4">
          <p className="text-2xl font-bold leading-snug">บันทึกแล้วค่ะ</p>
          <p className="text-xl leading-relaxed">ยายมีสมุนไพรต้ม ยาลูกกลอน ยาแบ่งถุง วิตามิน หรือยาอื่นที่ยังไม่ได้ถ่ายไหมคะ?</p>
          <BigButton onClick={() => navigate('/yai/scan')}>มี ถ่ายรูปเพิ่ม</BigButton>
          <BigButton variant="secondary" onClick={() => setStep('ONLY_THIS')}>
            มี แต่ไม่มีฉลาก
          </BigButton>
          <BigButton variant="ghost" onClick={finish}>
            ไม่มีแล้ว
          </BigButton>
        </Card>
      )}

      {step === 'ONLY_THIS' && (
        <Card className="space-y-4">
          <h2 className="text-xl font-bold">มีแค่นี้ ไม่เป็นไรค่ะ</h2>
          <p className="text-lg">บอกเท่าที่รู้ เราจะบันทึกไว้ว่า "รอผู้เชี่ยวชาญช่วยระบุ" และจะไม่เดาว่าเป็นยาอะไร</p>
          <div className="flex flex-wrap gap-2">
            {ONLY_THIS_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reasons.includes(r)}
                onClick={() => setReasons(reasons.includes(r) ? reasons.filter((x) => x !== r) : [...reasons, r])}
                className={`min-h-[48px] rounded-full border-2 px-4 text-base font-semibold ${reasons.includes(r) ? 'border-yai-deep bg-yai-mint' : 'border-yai-ink/15 bg-white'}`}
              >
                {r}
              </button>
            ))}
          </div>
          <Field label="เล่าเพิ่ม (ถ้ามี) เช่น ยาต้มสีน้ำตาลที่ญาติให้มา">
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <BigButton size="lg" onClick={saveOnlyThis}>
            บันทึกเท่าที่มี
          </BigButton>
        </Card>
      )}
    </div>
  );
};

const EditableField: React.FC<{ label: string; hint?: string; f: EvidenceField<string>; onChange: (v: string) => void }> = ({ label, hint, f, onChange }) => (
  <div className="space-y-1">
    <Field label={label} hint={hint}>
      <input className={inputCls} value={f.value ?? ''} placeholder="ยังไม่ทราบ" onChange={(e) => onChange(e.target.value)} />
    </Field>
    {f.value ? (
      <SourceChip origin={f.origin} synthetic={f.isSynthetic} confidence={f.extractionConfidence} verification={f.verification} />
    ) : (
      <span className="text-sm font-semibold text-yai-warn">ข้อมูลยังไม่ครบ</span>
    )}
  </div>
);
