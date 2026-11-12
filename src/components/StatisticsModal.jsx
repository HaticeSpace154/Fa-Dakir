import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, BookOpen, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Clock3, Flame, X } from 'lucide-react';
import { Select } from '@base-ui/react/select';
import NumberFlow from '@number-flow/react';
import AccessibleDialog from './ui/AccessibleDialog';
import { getReadingStats } from '../services/storageService';
import './StatisticsModal.css';

const ACTIVITY_RANGES = [
  { days: 15, label: '15 يومًا', description: 'آخر 15 يومًا' },
  { days: 30, label: 'شهر', description: 'آخر 30 يومًا' },
  { days: 90, label: '3 أشهر', description: 'آخر 90 يومًا' },
  { days: 365, label: 'سنة', description: 'آخر 365 يومًا' },
];

export default function StatisticsModal({ isOpen, onClose, stats = {}, khatmaData = {} }) {
  const [statsSnapshot, setStatsSnapshot] = useState(stats);
  const [activityRangeDays, setActivityRangeDays] = useState(15);
  useEffect(() => {
    if (!isOpen) return undefined;
    setStatsSnapshot(getReadingStats());
    const refresh = setInterval(() => setStatsSnapshot(getReadingStats()), 10000);
    return () => clearInterval(refresh);
  }, [isOpen]);
  const readPages = Math.min(604, Math.max(0, Number(khatmaData.readPages) || 0));
  const plans = Array.isArray(khatmaData.plans) ? khatmaData.plans : [];
  const activePlan = plans.find((plan) => plan.id === khatmaData.activePlanId);
  const completedKhatmas = plans.length
    ? plans.filter((plan) => Number(plan.readPages) >= 604).length
    : (Number(khatmaData.readPages) >= 604 ? 1 : 0);
  const activeDaySet = new Set(Array.isArray(statsSnapshot.activeDays) ? statsSnapshot.activeDays : []);
  const dailySeconds = statsSnapshot.dailySeconds && typeof statsSnapshot.dailySeconds === 'object' ? statsSnapshot.dailySeconds : {};
  const getDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const rhythmDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = getDateKey(date);
    const seconds = Math.max(0, Number(dailySeconds[key]) || 0);
    return { key, date, seconds, active: activeDaySet.has(key) || seconds > 0 };
  });
  const maxRhythmSeconds = Math.max(60, ...rhythmDays.map((day) => day.seconds));
  const activityDays = Array.from({ length: activityRangeDays }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (activityRangeDays - 1 - index));
    const key = getDateKey(date);
    const seconds = Math.max(0, Number(dailySeconds[key]) || 0);
    return { key, date, seconds, active: activeDaySet.has(key) || seconds > 0 };
  });
  const activeDays = activeDaySet.size;
  const activeKhatmas = plans.filter((plan) => (Number(plan.readPages) || 0) < 604).length || (plans.length === 0 && readPages > 0 ? 1 : 0);
  const trackedKhatmas = completedKhatmas + activeKhatmas;
  const rhythmTotalSeconds = rhythmDays.reduce((total, day) => total + day.seconds, 0);
  const activityCount = activityDays.filter((day) => day.active).length;
  const activityGridCells = [
    ...Array.from({ length: (activityDays[0]?.date.getDay() + 6) % 7 }, (_, index) => ({ key: `blank-${index}`, blank: true })),
    ...activityDays,
  ];
  const activityGridStyle = {
    '--activity-cell-size': activityRangeDays === 365 ? '7px' : activityRangeDays === 90 ? '11px' : activityRangeDays === 30 ? '14px' : '18px',
    '--activity-gap': activityRangeDays === 365 ? '2px' : '3px',
  };
  const activityRangeLabel = ACTIVITY_RANGES.find((range) => range.days === activityRangeDays)?.label || '15 يومًا';

  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="إحصائيات القراءة" backdropClassName="statistics-overlay" popupClassName="statistics-modal reactbits-ambient-surface">
        <header className="statistics-header">
          <div><BarChart3 size={20} /><h2>إحصائيات القراءة</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        </header>
        <div className="statistics-grid">
          <article className="statistics-card is-featured"><CalendarDays size={20} /><span>أيام القراءة النشطة</span><strong><NumberFlow value={activeDays} locales="en-US" format={{ useGrouping: false }} /></strong></article>
          <article className="statistics-card"><BookOpen size={19} /><span>الصفحات المقروءة في الختمة</span><strong><NumberFlow value={readPages} locales="en-US" format={{ useGrouping: false }} /> / 604</strong></article>
          <article className="statistics-card"><Flame size={19} /><span>الختمات المكتملة</span><strong><NumberFlow value={completedKhatmas} locales="en-US" format={{ useGrouping: false }} /></strong></article>
        </div>
        <section className="statistics-chart-card" aria-labelledby="reading-rhythm-title">
          <div className="statistics-chart-heading">
            <div><Activity size={17} /><h3 id="reading-rhythm-title">إيقاع القراءة</h3></div>
            <span><Clock3 size={14} /> {Math.floor(rhythmTotalSeconds / 60)} دقيقة هذا الأسبوع</span>
          </div>
          <div className="reading-rhythm-chart" role="img" aria-label="مخطط دقائق القراءة خلال آخر سبعة أيام" dir="ltr">
            {rhythmDays.map((day) => {
              const minutes = Math.round(day.seconds / 60);
              const height = day.seconds > 0 ? Math.max(8, (day.seconds / maxRhythmSeconds) * 100) : 3;
              return (
                <div className={`rhythm-day ${day.active ? 'is-active' : ''}`} key={day.key} title={`${day.date.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'short' })}: ${minutes} دقيقة`}>
                  <span className="rhythm-bar-value">{minutes > 0 ? minutes : ''}</span>
                  <span className="rhythm-bar-track"><span className="rhythm-bar-fill" style={{ height: `${height}%` }} /></span>
                  <span className="rhythm-day-label">{day.date.toLocaleDateString('ar', { weekday: 'short' })}</span>
                </div>
              );
            })}
          </div>
          <p className="statistics-chart-note">يُسجّل وقت القراءة اليومي من الآن فصاعدًا.</p>
        </section>

        <section className="statistics-chart-card khatma-chart-card" aria-labelledby="khatma-chart-title">
          <div className="statistics-chart-heading">
            <div><Flame size={17} /><h3 id="khatma-chart-title">حالة الختمات</h3></div>
            <strong><NumberFlow value={completedKhatmas} locales="en-US" format={{ useGrouping: false }} /> مكتملة</strong>
          </div>
          <div className="khatma-status-chart" role="img" aria-label={`${completedKhatmas} ختمات مكتملة و${activeKhatmas} ختمات قيد القراءة`}>
            {trackedKhatmas > 0 ? <>
              <span className="khatma-status-completed" style={{ width: `${(completedKhatmas / trackedKhatmas) * 100}%` }} />
              <span className="khatma-status-active" style={{ width: `${(activeKhatmas / trackedKhatmas) * 100}%` }} />
            </> : <span className="khatma-status-empty" />}
          </div>
          <div className="khatma-status-legend">
            <span><i className="legend-completed" />مكتملة <b>{completedKhatmas}</b></span>
            <span><i className="legend-active" />قيد القراءة <b>{activeKhatmas}</b></span>
          </div>
          {activePlan?.name && <p className="statistics-active-plan">الختمة النشطة: {activePlan.name}</p>}
        </section>

        <section className="statistics-chart-card activity-chart-card" aria-labelledby="daily-activity-title">
          <div className="statistics-chart-heading">
            <div className="activity-chart-controls">
              <div><CalendarDays size={17} /><h3 id="daily-activity-title">سجل النشاط اليومي</h3></div>
              <span id="activity-range-label" className="sr-only">الفترة الزمنية لسجل النشاط</span>
              <Select.Root value={String(activityRangeDays)} onValueChange={(value) => { if (value) setActivityRangeDays(Number(value)); }} modal={false}>
                <Select.Trigger className="activity-range-trigger" aria-labelledby="activity-range-label">
                  <Select.Value>{(value) => ACTIVITY_RANGES.find((range) => range.days === Number(value))?.label || '15 يومًا'}</Select.Value>
                  <Select.Icon className="activity-range-chevron"><ChevronDown size={14} /></Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="activity-range-positioner" side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false}>
                    <Select.Popup className="activity-range-popup">
                      <Select.List className="activity-range-list">
                        {ACTIVITY_RANGES.map((range) => (
                          <Select.Item key={range.days} value={String(range.days)} className="activity-range-option">
                            <span className="activity-range-option-copy"><strong><Select.ItemText>{range.label}</Select.ItemText></strong><small>{range.description}</small></span>
                            <Select.ItemIndicator className="activity-range-option-check"><Check size={14} /></Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.List>
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            </div>
            <span>{activityCount} / {activityRangeDays} يومًا نشطًا</span>
          </div>
          <div className="activity-day-grid" style={activityGridStyle} role="group" aria-label={`نشاط القراءة خلال آخر ${activityRangeLabel}`} dir="ltr">
            {activityGridCells.map((day) => day.blank
              ? <span key={day.key} className="activity-day-placeholder" aria-hidden="true" />
              : <span key={day.key} className={`activity-day ${day.active ? 'is-active' : ''}`} role="img" aria-label={`${day.date.toLocaleDateString('ar', { day: 'numeric', month: 'short' })}: ${day.active ? 'نشط' : 'غير نشط'}`} title={`${day.date.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'short' })} · ${day.active ? 'نشط' : 'غير نشط'} · ${Math.round(day.seconds / 60)} دقيقة`} />
            )}
          </div>
          <div className="activity-day-legend">
            <span><CheckCircle2 size={13} />نشط <b>{activityCount}</b></span>
            <span><Circle size={13} />غير نشط <b>{activityRangeDays - activityCount}</b></span>
          </div>
        </section>
    </AccessibleDialog>
  );
}
