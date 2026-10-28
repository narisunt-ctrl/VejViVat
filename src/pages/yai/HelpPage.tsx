import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Siren } from 'lucide-react';
import { useYai } from '../../services/yai/yaiStore';
import { Card, Notice, PageTitle } from '../../components/yai/ui';

export const HelpPage: React.FC = () => {
  const settings = useYai((s) => s.settings);
  const phone = settings.familyPhone.replace(/[^\d+]/g, '');

  return (
    <div className="space-y-5">
      <PageTitle title="ช่วยเหลือ" subtitle="เรื่องทั่วไปโทรหาหลาน เรื่องฉุกเฉินโทร 1669" />

      <Card>
        <h2 className="text-xl font-bold">ขอความช่วยเหลือจากหลาน</h2>
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="mt-3 flex min-h-[64px] items-center justify-center gap-2 rounded-2xl bg-yai-deep px-4 text-xl font-bold text-white"
          >
            <Phone className="h-7 w-7" aria-hidden="true" />
            โทรหา{settings.familyName || 'หลาน'}
          </a>
        ) : (
          <p className="mt-2 text-lg">
            ยังไม่ได้ใส่เบอร์ของหลาน{' '}
            <Link to="/yai/family" className="font-bold text-yai-deep underline">
              ใส่เบอร์ตอนนี้
            </Link>
          </p>
        )}
      </Card>

      <Card className="border-yai-alert/30">
        <h2 className="text-xl font-bold text-yai-alert">เหตุฉุกเฉิน</h2>
        <p className="mt-1 text-lg">เจ็บหน้าอก หายใจไม่ออก หมดสติ แขนขาอ่อนแรง หรืออาการรุนแรงอื่นๆ ให้โทรทันที ไม่ต้องรอแอป</p>
        <a
          href="tel:1669"
          className="mt-3 flex min-h-[80px] items-center justify-center gap-3 rounded-3xl bg-yai-alert px-4 text-2xl font-bold text-white shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
        >
          <Siren className="h-9 w-9" aria-hidden="true" />
          โทรฉุกเฉิน 1669
        </a>
        <p className="mt-2 text-sm text-yai-ink/70">ปุ่มนี้เปิดแอปโทรศัพท์ของเครื่องให้โทรเอง แอปนี้ไม่ได้เรียกรถพยาบาลและไม่รู้ว่าสายติดหรือไม่</p>
      </Card>

      <Notice tone="warn" title="ยายพร้อมไม่ใช่บริการฉุกเฉิน">
        ระบบไม่ประเมินอาการหรือคัดกรองความรุนแรงแทนบุคลากรทางการแพทย์
      </Notice>
    </div>
  );
};
