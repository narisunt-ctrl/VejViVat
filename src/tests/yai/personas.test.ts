import { describe, it, expect, beforeEach } from 'vitest';
import { createPersonaSeedState, createProfessionalSeedState, PERSONAS, personaOf, PROFESSIONAL_PATIENT_ID } from '../../data/yai/personas';
import { demoNow, yaiStore } from '../../services/yai/yaiStore';
import { bangkokDate } from '../../domain/yai/journal';
import { sleepEnergyObservation } from '../../domain/yai/wellness';
import { stepBoard } from '../../domain/yai/steps';
import { getElementSummaryForPatient } from '../../services/yai/elementSummaryAdapter';

describe('demo personas', () => {
  it('offers the two target groups', () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(['RETIREE', 'PROFESSIONAL']);
    expect(personaOf(createPersonaSeedState('RETIREE'))).toBe('RETIREE');
  });

  it('builds a fully synthetic professional with no medicines and no clinic link', () => {
    const s = createProfessionalSeedState();
    const today = bangkokDate(new Date());
    expect(s.patient.id).toBe(PROFESSIONAL_PATIENT_ID);
    expect(s.patient.age).toBe(48);
    expect(s.medicines).toHaveLength(0);
    expect(s.reminders).toHaveLength(0);
    expect(s.checkins!.every((c) => c.isSynthetic)).toBe(true);
    expect(s.checkins!.some((c) => c.date === today)).toBe(false);
    expect(s.measurements!.every((m) => m.isSynthetic)).toBe(true);
    expect(s.journal!.every((e) => e.isSynthetic && e.patientId === PROFESSIONAL_PATIENT_ID)).toBe(true);
    expect(getElementSummaryForPatient(s.patient.id).status).toBe('UNKNOWN');
  });

  it('has enough data for the sleep–energy observation and a walking challenge', () => {
    const s = createProfessionalSeedState();
    const today = bangkokDate(new Date());
    const obs = sleepEnergyObservation(s, today);
    expect(obs).not.toBeNull();
    expect(obs!.groupA.mean).toBeGreaterThan(obs!.groupB.mean);
    const board = stepBoard(s, today);
    expect(board.find((r) => r.isMe)!.avatar).toBe('🧑');
    expect(board.length).toBe(4);
  });
});

describe('switching persona in the store', () => {
  beforeEach(() => yaiStore.reset());

  it('loads the other user, keeps theme and text size, and reset keeps the chosen user', () => {
    yaiStore.updateSettings({ theme: 'light', fontScale: 150 });
    yaiStore.switchPersona('PROFESSIONAL');
    let s = yaiStore.getState();
    expect(s.patient.id).toBe(PROFESSIONAL_PATIENT_ID);
    expect(s.settings).toMatchObject({ persona: 'PROFESSIONAL', theme: 'light', fontScale: 150 });
    expect(s.audit[0].action).toBe('DEMO_RESET');
    yaiStore.reset();
    expect(yaiStore.getState().patient.id).toBe(PROFESSIONAL_PATIENT_ID);
    yaiStore.switchPersona('RETIREE');
    s = yaiStore.getState();
    expect(s.patient.displayName).toMatch(/สมศรี/);
    expect(s.medicines.length).toBeGreaterThan(0);
    expect(bangkokDate(demoNow())).toBeTruthy();
  });
});
