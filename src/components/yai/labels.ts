import { MedicationPassport } from '../../domain/yai/models';

export const FORM_LABEL: Record<NonNullable<MedicationPassport['form']['value']>, string> = {
  UNKNOWN: 'ยังไม่ทราบ',
  TABLET: 'ยาเม็ด',
  CAPSULE: 'แคปซูล',
  POWDER: 'ยาผง',
  EXTRACT: 'สารสกัด',
  DECOCTION: 'ยาต้ม',
  SACHET: 'ยาซอง',
  OTHER: 'อื่นๆ',
};
