// Feature: backend-integration-refactor, Property 13: Section analytics lookup
// Validates: Requirements 5.2

import * as fc from 'fast-check';
import { getSectionAnalytics, SECTION_DATA } from '../analyticsService';

describe('analyticsService — Property 13: Section analytics lookup', () => {
  it(
    'getSectionAnalytics(sectionName) returns a non-null object whose students, sectionAvg, and gradeDistribution match the mock data',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...Object.keys(SECTION_DATA)),
          async (sectionName) => {
            const result = await getSectionAnalytics(sectionName);

            // Must be non-null
            if (result === null) return false;

            const expected = SECTION_DATA[sectionName];

            // students field must match
            if (result.students !== expected.students) return false;

            // sectionAvg field must match
            if (result.sectionAvg !== expected.sectionAvg) return false;

            // gradeDistribution fields must match
            if (result.gradeDistribution.A !== expected.gradeDistribution.A) return false;
            if (result.gradeDistribution.B !== expected.gradeDistribution.B) return false;
            if (result.gradeDistribution.C !== expected.gradeDistribution.C) return false;
            if (result.gradeDistribution.F !== expected.gradeDistribution.F) return false;

            return true;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

describe('analyticsService — real API contract mapping', () => {
  const TEST_BASE_URL = 'http://test.example.com';
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = TEST_BASE_URL;
    if (!global.fetch) {
      global.fetch = jest.fn();
    }
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('maps section analytics API payloads into the UI model', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: jest.fn().mockResolvedValue({
        section_id: 'section-123',
        section_name: 'Grade 7 - Section A',
        students: 42,
        section_avg: 74.2,
        section_avg_trend: [68, 70, 71],
        top_performers_trend: [85, 87, 88],
        at_risk_trend: [48, 46, 45],
        grade_distribution: { A: 6, B: 14, C: 16, F: 6 },
        attendance: { present: 87, late: 7, absent: 6 },
        chronic_absentees: [{ name: 'Dawit Bekele', initials: 'DB', rate: 65 }],
        subject_averages: [{ subject: 'Mathematics', avg: 74 }],
        submissions: { submitted: 146, late: 12, missing: 7 },
        parent_engagement: { high: 3, moderate: 3, low: 2 },
        activity_performance: [{
          title: 'Chapter 3 HW',
          type: 'Homework',
          avg_pct: 72,
          avg_score: '28/42',
          grade: 'C',
          submitted: 40,
          total: 42,
        }],
      }),
    });

    const analyticsService = await import('../analyticsService');
    const result = await analyticsService.getSectionAnalytics({
      sectionId: 'section-123',
      sectionName: 'Grade 7 - Section A',
    });

    expect(result).not.toBeNull();
    expect(result?.sectionAvg).toBe(74.2);
    expect(result?.sectionAvgTrend).toEqual([68, 70, 71]);
    expect(result?.topPerformersTrend).toEqual([85, 87, 88]);
    expect(result?.atRiskTrend).toEqual([48, 46, 45]);
    expect(result?.subjectAvgs).toEqual([
      { subject: 'Mathematics', avg: 74, color: '#185FA5' },
    ]);
    expect(result?.parentEngagement).toEqual({ high: 3, moderate: 3, low: 2 });
    expect(result?.activityPerformance[0]).toEqual({
      title: 'Chapter 3 HW',
      type: 'Homework',
      avgPct: 72,
      avgScore: '28/42',
      grade: 'C',
      submitted: 40,
      total: 42,
    });
  });
});
