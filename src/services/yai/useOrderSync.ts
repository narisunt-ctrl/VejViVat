import { useEffect } from 'react';
import { useCarebridgeOutbox, carebridgeOutbox } from './prescriptionSyncAdapter';
import { useYai, yaiStore } from './yaiStore';

/**
 * Pull clinician orders published in the demo CareBridge app into ยายพร้อม while a page is open.
 * Safe to run repeatedly: importing the same order version again changes nothing.
 */
export function useClinicianOrderSync() {
  const outbox = useCarebridgeOutbox();
  const patientId = useYai((s) => s.patient.id);
  const consents = useYai((s) => s.consents);
  useEffect(() => {
    const snapshots = carebridgeOutbox.latestForPatient(patientId);
    if (snapshots.length) yaiStore.syncClinicianOrders(snapshots);
  }, [outbox, patientId, consents]);
}
