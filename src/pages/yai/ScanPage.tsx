import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveCamera, CaptureResult } from '../../components/medsight/LiveCamera';
import { yaiStore, useYai, demoNow } from '../../services/yai/yaiStore';
import { scanSession } from '../../services/yai/scanSession';
import { BigButton, Notice, PageTitle } from '../../components/yai/ui';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const photos = useYai((s) => s.photos);
  const [sessionIds, setSessionIds] = useState<string[]>(() => scanSession.get());
  const [busy, setBusy] = useState(false);
  const sessionPhotos = photos.filter((p) => sessionIds.includes(p.id));

  const onCapture = (r: CaptureResult) => {
    setBusy(true);
    const id = yaiStore.addPhoto({ dataUrl: r.dataUrl, source: r.source, quality: r.quality, capturedAt: demoNow().toISOString() });
    scanSession.add(id);
    setSessionIds(scanSession.get());
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <PageTitle title="ถ่ายรูปยาที่ยายใช้อยู่" subtitle="หมุนกล่องให้เห็นชื่อยา ถ่ายได้หลายด้าน ไม่ต้องครบทุกด้าน" back="/yai" />
      <LiveCamera onCapture={onCapture} busy={busy} />

      {sessionPhotos.length > 0 && (
        <div className="space-y-3">
          <p className="text-lg font-semibold">ได้ภาพแล้ว {sessionPhotos.length} รูป</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessionPhotos.map((p) => (
              <img key={p.id} src={p.dataUrl} alt="รูปยาที่ถ่ายไว้" className="h-24 w-20 shrink-0 rounded-xl object-cover" />
            ))}
          </div>
          <BigButton size="lg" onClick={() => navigate('/yai/scan/review')}>
            ถ่ายพอแล้ว ไปดูข้อมูล
          </BigButton>
        </div>
      )}

      <Notice title="รูปเก็บไว้ในเครื่องนี้เท่านั้น">ไม่ได้ส่งภาพขึ้นอินเทอร์เน็ต และระบบไม่ระบุยาจากสีหรือรูปร่างของเม็ดยา</Notice>
      <button type="button" onClick={() => navigate('/yai/scan/review?onlyThis=1')} className="min-h-[48px] w-full text-lg font-bold text-yai-deep underline">
        ถ่ายไม่ได้ / ไม่มีฉลาก — มีแค่นี้
      </button>
    </div>
  );
};
