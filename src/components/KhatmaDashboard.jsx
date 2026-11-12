import React, { useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Award, X, Calendar, Flame, ArrowRight, Target, Plus, Minus, Trash2, CheckCircle2, Circle, ChevronDown, Search, TrendingUp, BookmarkCheck, RotateCcw, BookOpen, ListMusic, Repeat2, Save, Play } from 'lucide-react';
import SpotlightCard from './react-bits/SpotlightCard';
import ShinyText from './react-bits/ShinyText';
import AccessibleDialog from './ui/AccessibleDialog';
import { SURAHS, toEasternArabic } from '../data/quranMetadata';
import { getCustomWirds, removeCustomWird, saveCustomWird } from '../services/storageService';
import './KhatmaDashboard.css';

const makeCustomWirdEntry = (surah = 1) => ({ id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, surah: Math.max(1, Math.min(114, Number(surah) || 1)), repeats: 1 });

const dayNumberFromKey = (key) => {
  const [year, month, day] = String(key || '').split('-').map(Number);
  return year && month && day ? Math.floor(Date.UTC(year, month - 1, day) / 86400000) : null;
};

const formatPages = (count) => {
  if (count === 1) return 'صفحة واحدة';
  if (count === 2) return 'صفحتان';
  return `${toEasternArabic(count)} ${count >= 3 && count <= 10 ? 'صفحات' : 'صفحة'}`;
};

function StatRing({ value, label, percent }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const boundedPercent = Math.min(100, Math.max(0, percent));
  return (
    <div className="stat-ring-content" aria-hidden="true">
      <svg className="stat-ring-svg" viewBox="0 0 100 100">
        <circle className="stat-ring-track" cx="50" cy="50" r={radius} />
        <circle className="stat-ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - boundedPercent / 100)} />
      </svg>
      <span className="stat-ring-copy"><strong>{value}</strong><small>{label}</small></span>
    </div>
  );
}

/**
 * KhatmaDashboard — React Bits animated Khatma & Wird tracking modal
 */
export default function KhatmaDashboard({
  isOpen,
  onClose,
  khatmaData = {},
  onStartWird,
  onStartCustomWird,
  onSavePlan,
  onSelectPlan,
  onDeletePlan
}) {
  const plans = Array.isArray(khatmaData.plans) ? khatmaData.plans : [];
  const activePlan = plans.find((plan) => plan.id === khatmaData.activePlanId) || plans[0] || null;
  const savedDurationDays = Math.max(1, Math.min(365, Number(activePlan?.durationDays ?? khatmaData.durationDays) || 30));
  const savedUnit = ['juz', 'hizb', 'page'].includes(activePlan?.unit || khatmaData.unit) ? (activePlan?.unit || khatmaData.unit) : 'juz';
  const savedName = activePlan?.name || '';
  const [durationDays, setDurationDays] = useState(savedDurationDays);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [unit, setUnit] = useState(savedUnit);
  const [planName, setPlanName] = useState(savedName);
  const [selectedPlanId, setSelectedPlanId] = useState(activePlan?.id || '');
  const [creatingPlan, setCreatingPlan] = useState(!activePlan);
  const [activeSection, setActiveSection] = useState('current');
  const [savedCustomWirds, setSavedCustomWirds] = useState(getCustomWirds);
  const [editingCustomWirdId, setEditingCustomWirdId] = useState('');
  const [surahSearchTerm, setSurahSearchTerm] = useState('');
  const [customWirdName, setCustomWirdName] = useState(() => getCustomWirds()[0]?.name || 'وردي المخصص');
  const [customWirdSurahs, setCustomWirdSurahs] = useState(() => getCustomWirds()[0]?.surahs || [makeCustomWirdEntry()]);
  const [openSurahPickerId, setOpenSurahPickerId] = useState('');
  const totalPages = 604;
  const readPageValue = creatingPlan ? 0 : (activePlan?.readPages ?? khatmaData.readPages ?? 14);
  const readPages = Math.max(0, Math.min(totalPages, Number(readPageValue) || 0));
  const progressPct = Math.min(100, Math.round((readPages / totalPages) * 100));
  const unitMeta = {
    juz: { label: 'أجزاء', total: 30, pages: 604 / 30 },
    hizb: { label: 'أحزاب', total: 60, pages: 604 / 60 },
    page: { label: 'صفحات', total: 604, pages: 1 },
  }[unit];
  const unitsPerDay = unitMeta.total / durationDays;
  const pagesPerDay = Math.ceil(604 / durationDays);
  const dailySchedule = Array.from({ length: durationDays }, (_, index) => {
    const pageStart = Math.floor((index * totalPages) / durationDays) + 1;
    const pageEnd = Math.floor(((index + 1) * totalPages) / durationDays);
    // Partition the selected reading units directly by day so ranges are
    // contiguous (e.g. 1–5, then 6–8) and never repeat a juz or hizb.
    const unitStartForDay = Math.floor((index * unitMeta.total) / durationDays) + 1;
    const unitEndForDay = Math.floor(((index + 1) * unitMeta.total) / durationDays);
    return {
      day: index + 1,
      pageStart,
      pageEnd,
      unitStart: unitEndForDay >= unitStartForDay ? unitStartForDay : null,
      unitEnd: unitEndForDay >= unitStartForDay ? unitEndForDay : null,
      completed: readPages >= pageEnd,
    };
  });
  const completedScheduleDays = dailySchedule.filter((entry) => entry.completed).length;

  // Day-aware daily wird: the schedule is anchored to the plan's start date.
  const startDayNumber = dayNumberFromKey(activePlan?.startDate);
  const now = new Date();
  const todayDayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const currentDay = startDayNumber === null ? 1 : Math.max(1, Math.min(durationDays, todayDayNumber - startDayNumber + 1));
  const todayEntry = dailySchedule[currentDay - 1];
  const isKhatmaComplete = readPages >= totalPages;
  const todayDone = readPages >= todayEntry.pageEnd;
  const aheadPages = todayDone ? readPages - todayEntry.pageEnd : 0;
  const behindPages = todayDone ? 0 : Math.max(0, todayEntry.pageStart - 1 - readPages);
  // Finished today's wird -> show only the next day's wird, resuming right after the last page read.
  const wirdEntry = isKhatmaComplete ? null : (todayDone ? dailySchedule.find((entry) => entry.pageEnd > readPages) : todayEntry);
  const wirdStart = Math.min(totalPages, readPages + 1);
  const wirdEnd = wirdEntry ? wirdEntry.pageEnd : totalPages;
  const wirdIsFullDay = Boolean(wirdEntry) && wirdStart === wirdEntry.pageStart && wirdEntry.unitStart !== null;
  const unitNoun = unit === 'juz' ? 'جزء' : unit === 'hizb' ? 'حزب' : 'صفحة';
  const aheadUnits = unit === 'page' ? 0 : Math.round((aheadPages / unitMeta.pages) * 10) / 10;

  const isPlanDirty = creatingPlan || unit !== savedUnit || durationDays !== savedDurationDays || planName.trim() !== savedName;

  const savePlan = () => {
    const saved = onSavePlan?.({ id: creatingPlan ? undefined : selectedPlanId, name: planName, unit, durationDays });
    if (saved?.activePlanId) {
      setSelectedPlanId(saved.activePlanId);
      setCreatingPlan(false);
      setActiveSection('current');
    }
    setCustomDaysInput('');
  };

  const selectPlan = (nextUnit = unit, nextDays = durationDays) => {
    setUnit(nextUnit);
    setDurationDays(nextDays);
    setCustomDaysInput('');
  };

  const startNewPlan = () => {
    setActiveSection('create');
    setCreatingPlan(true);
    setSelectedPlanId('');
    setPlanName(`ختمة ${plans.length + 1}`);
    setDurationDays(30);
    setUnit('juz');
    setCustomDaysInput('');
  };

  const choosePlan = (plan) => {
    setActiveSection('current');
    setSelectedPlanId(plan.id);
    setCreatingPlan(false);
    setPlanName(plan.name);
    setDurationDays(plan.durationDays);
    setUnit(plan.unit);
    setCustomDaysInput('');
    onSelectPlan?.(plan.id);
  };

  const deletePlan = (plan) => {
    const updated = onDeletePlan?.(plan.id);
    if (plan.id === selectedPlanId) {
      const nextPlan = updated?.plans?.find((item) => item.id === updated.activePlanId) || updated?.plans?.[0];
      if (nextPlan) choosePlan(nextPlan);
      else startNewPlan();
    }
  };

  const applyCustomWirdSave = (saved, wasEditing) => {
    const updated = getCustomWirds();
    setSavedCustomWirds(updated);
    if (wasEditing) {
      // Editing an existing wird — keep the builder in context so further saves update it.
      setEditingCustomWirdId(saved.id);
      setCustomWirdName(saved.name);
      setCustomWirdSurahs(saved.surahs);
    } else {
      // Created a new wird — clear the builder back to a single fresh box.
      setEditingCustomWirdId('');
      setCustomWirdName(`ورد جديد ${toEasternArabic(updated.length + 1)}`);
      setCustomWirdSurahs([makeCustomWirdEntry()]);
    }
  };

  const saveCustomWirdPlan = () => {
    const wasEditing = Boolean(editingCustomWirdId);
    const saved = saveCustomWird({ id: editingCustomWirdId, name: customWirdName, surahs: customWirdSurahs });
    if (saved) applyCustomWirdSave(saved, wasEditing);
  };

  const startCustomWird = () => {
    const wasEditing = Boolean(editingCustomWirdId);
    const saved = saveCustomWird({ id: editingCustomWirdId, name: customWirdName, surahs: customWirdSurahs });
    if (!saved) return;
    applyCustomWirdSave(saved, wasEditing);
    const readingSequence = saved.surahs.flatMap(({ surah, repeats }) => Array.from({ length: repeats }, () => surah));
    onStartCustomWird?.(readingSequence);
    onClose();
  };

  const startSavedWird = (savedWird) => {
    const readingSequence = (savedWird?.surahs || []).flatMap(({ surah, repeats }) => Array.from({ length: Math.max(1, Number(repeats) || 1) }, () => surah));
    if (!readingSequence.length) return;
    onStartCustomWird?.(readingSequence);
    onClose();
  };

  const startBlankCustomWird = () => {
    setEditingCustomWirdId('');
    setCustomWirdName(`ورد جديد ${toEasternArabic(savedCustomWirds.length + 1)}`);
    setCustomWirdSurahs([makeCustomWirdEntry()]);
  };

  const restoreCustomWird = (plan) => {
    setEditingCustomWirdId(plan.id);
    setCustomWirdName(plan.name);
    setCustomWirdSurahs(plan.surahs);
  };

  const clearCustomWird = (id) => {
    setSavedCustomWirds(removeCustomWird(id));
    if (editingCustomWirdId === id) startBlankCustomWird();
  };

  const editCustomWird = (plan) => {
    restoreCustomWird(plan);
    setActiveSection('customWird');
  };
  return (
    <AccessibleDialog open={isOpen} onClose={onClose} label="لوحة تحكم ختمتي" backdropClassName="khatma-overlay" popupClassName="khatma-modal-card reactbits-ambient-surface">
        {/* Header */}
        <div className="khatma-modal-head">
          <div className="head-title-wrap">
            <Award size={22} className="gold-icon" />
            <ShinyText text="لوحة ختمتي القرآنية" speed={4} color="var(--gold)" className="khatma-title" />
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <div className="khatma-section-tabs" role="tablist" aria-label="أقسام ختمتي">
          <button type="button" role="tab" aria-selected={activeSection === 'current'} className={activeSection === 'current' ? 'is-active' : ''} onClick={() => setActiveSection('current')}>الحالية</button>
          <button type="button" role="tab" aria-selected={activeSection === 'create'} className={activeSection === 'create' ? 'is-active' : ''} onClick={startNewPlan}>إنشاء</button>
          <button type="button" role="tab" aria-selected={activeSection === 'saved'} className={activeSection === 'saved' ? 'is-active' : ''} onClick={() => setActiveSection('saved')}>المحفوظة ({toEasternArabic(plans.length + savedCustomWirds.length)})</button>
          <button type="button" role="tab" aria-selected={activeSection === 'customWird'} className={activeSection === 'customWird' ? 'is-active' : ''} onClick={() => setActiveSection('customWird')}>ورد مخصص</button>
        </div>

        {/* Scrollable Body */}
        <div className="khatma-modal-body">
          <section className="khatma-plan-picker" aria-label="المحفوظة: خطط الختمة والأوراد المخصصة" hidden={activeSection !== 'saved'}>
            <div className="khatma-plan-picker-head">
              <strong>المحفوظة</strong>
              <button type="button" className="khatma-new-plan-btn" onClick={startNewPlan}><Plus size={16} /> ختمة جديدة</button>
            </div>

            {/* Khatma plans group */}
            <div className="saved-group saved-group-khatma" role="group" aria-label="خطط الختمة الذهبية">
              <div className="saved-group-head">
                <span className="saved-group-tag tag-khatma"><Award size={12} strokeWidth={2.4} /> ختمة</span>
                <span className="saved-group-caption">خطط ختم المصحف كاملًا</span>
                <b className="saved-group-count">{toEasternArabic(plans.length)}</b>
              </div>
              {plans.length > 0 ? (
                <div className="khatma-plan-list">
                  {plans.map((plan) => (
                    <div className={`khatma-plan-chip ${plan.id === selectedPlanId && !creatingPlan ? 'is-active' : ''}`} key={plan.id}>
                      <button type="button" className="khatma-plan-select" onClick={() => choosePlan(plan)}>
                        <span className="saved-plan-topline">
                          <strong>{plan.name}</strong>
                          <b>{toEasternArabic(Math.round((Math.min(604, Number(plan.readPages) || 0) / 604) * 100))}٪</b>
                        </span>
                        <small className="saved-plan-meta">{toEasternArabic(plan.durationDays)} يوم · {plan.unit === 'juz' ? 'بالجزء' : plan.unit === 'hizb' ? 'بالحزب' : 'بالصفحة'}</small>
                        <span className="saved-plan-progress-track"><span style={{ width: `${Math.min(100, Math.max(0, ((Number(plan.readPages) || 0) / 604) * 100))}%` }} /></span>
                        <small className="saved-plan-pages">{toEasternArabic(Math.min(604, Number(plan.readPages) || 0))} / 604 صفحة</small>
                      </button>
                      <button type="button" className="khatma-delete-plan-btn" aria-label={`حذف ${plan.name}`} title="حذف الخطة" onClick={() => deletePlan(plan)}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              ) : <p className="khatma-empty-plans">أنشئ خطتك الأولى واحفظها لتظهر هنا.</p>}
            </div>

            {/* Custom wirds group — deliberately distinct from khatma plans */}
            <div className="saved-group saved-group-wird" role="group" aria-label="الأوراد المخصصة المحفوظة">
              <div className="saved-group-head">
                <span className="saved-group-tag tag-wird"><ListMusic size={12} strokeWidth={2.4} /> ورد مخصص</span>
                <span className="saved-group-caption">سور محددة بمرات تكرار</span>
                <button type="button" className="saved-group-new" onClick={() => { startBlankCustomWird(); setActiveSection('customWird'); }}><Plus size={13} /> ورد جديد</button>
              </div>
              {savedCustomWirds.length > 0 ? (
                <div className="custom-wird-saved-list">
                  {savedCustomWirds.map((savedWird) => (
                    <article className="wird-saved-card" key={savedWird.id}>
                      <span className="wird-saved-icon" aria-hidden="true"><BookmarkCheck size={17} /></span>
                      <div className="wird-saved-body">
                        <strong className="wird-saved-name">{savedWird.name}</strong>
                        <small className="wird-saved-meta">{toEasternArabic(savedWird.surahs.length)} سور · {toEasternArabic(savedWird.surahs.reduce((sum, entry) => sum + Math.max(1, Number(entry.repeats) || 1), 0))} قراءة</small>
                        <div className="wird-saved-chips">
                          {savedWird.surahs.slice(0, 3).map((entry) => {
                            const surah = SURAHS.find((item) => item.id === Number(entry.surah));
                            return <span className="wird-saved-chip" key={entry.id}>{surah?.name || entry.surah}<b>×{toEasternArabic(entry.repeats)}</b></span>;
                          })}
                          {savedWird.surahs.length > 3 && <span className="wird-saved-chip is-more">+{toEasternArabic(savedWird.surahs.length - 3)}</span>}
                        </div>
                      </div>
                      <div className="wird-saved-actions">
                        <button type="button" className="wird-saved-start" onClick={() => startSavedWird(savedWird)} aria-label={`ابدأ ${savedWird.name}`} title="ابدأ الورد الآن"><Play size={15} fill="currentColor" /></button>
                        <button type="button" className="wird-saved-edit" onClick={() => editCustomWird(savedWird)} aria-label={`تعديل ${savedWird.name}`} title="تعديل الورد"><RotateCcw size={14} /></button>
                        <button type="button" className="wird-saved-delete" onClick={() => clearCustomWird(savedWird.id)} aria-label={`حذف ${savedWird.name}`} title="حذف الورد"><Trash2 size={14} /></button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="khatma-empty-plans">لا توجد أوراد مخصصة محفوظة بعد. صمّم وردك من تبويب «ورد مخصص».</p>}
            </div>
          </section>

          <div className="khatma-current-section" hidden={activeSection !== 'current'}>
          {/* Main Progress Ring & Overview */}
          <div className="khatma-hero-card">
            <div className="ring-container">
              <svg className="progress-ring-svg" viewBox="0 0 120 120">
                <circle className="ring-track" cx="60" cy="60" r="50" />
                <circle
                  className="ring-indicator"
                  cx="60"
                  cy="60"
                  r="50"
                  strokeDasharray="314.159"
                  strokeDashoffset={314.159 * (1 - (activePlan ? progressPct : 0) / 100)}
                />
              </svg>
              <div className="ring-label-box">
                <span className="ring-pct">{activePlan ? `${toEasternArabic(progressPct)}٪` : '—'}</span>
                <span className="ring-sub">مكتمل</span>
              </div>
            </div>

            <div className="hero-text-wrap">
              <h3>{activePlan?.name || 'لم تبدأ ختمة بعد'}</h3>
              <p>{activePlan ? 'رواية ورش عن نافع — المصحف الشريف' : 'أنشئ خطة ختمة لمتابعة تقدمك اليومي.'}</p>
              {activePlan && <div className="hero-badge">
                <Flame size={15} />
                <span>الهدف: ختمة خلال {toEasternArabic(durationDays)} يومًا</span>
              </div>}
              <button type="button" className="khatma-edit-current-btn" onClick={() => {
                if (!activePlan) startNewPlan();
                else {
                  setCreatingPlan(false);
                  setSelectedPlanId(activePlan.id);
                  setPlanName(activePlan.name);
                  setDurationDays(activePlan.durationDays);
                  setUnit(activePlan.unit);
                  setActiveSection('create');
                }
              }}>{activePlan ? 'تعديل خطة الختمة' : 'إنشاء ختمة'}</button>
            </div>
          </div>

          {!activePlan && <p className="khatma-current-empty">لم تحفظ ختمة نشطة بعد. أنشئ خطة جديدة لتظهر هنا تفاصيل تقدمك ووردك اليومي.</p>}

          {activePlan && <>
          {/* Today's Wird Banner */}
          <SpotlightCard className="today-wird-card">
            <div className="wird-card-head">
              <div className="wird-tag">
                {todayDone ? <CheckCircle2 size={15} /> : <Target size={15} />}
                <span>{isKhatmaComplete ? 'اكتملت الختمة' : todayDone ? `أتممت ورد اليوم ${toEasternArabic(currentDay)}` : `وردك اليومي المقترح — اليوم ${toEasternArabic(currentDay)}`}</span>
              </div>
              {!isKhatmaComplete && <span className="wird-amount">{toEasternArabic(Number(unitsPerDay.toFixed(1)))} {unitMeta.label} يوميًا</span>}
            </div>

            {isKhatmaComplete ? (
              <p className="wird-status-note is-complete">ما شاء الله، أتممت هذه الختمة كاملة ({toEasternArabic(totalPages)} صفحة). تقبّل الله منك.</p>
            ) : (
              <>
                {todayDone && aheadPages > 0 && (
                  <p className="wird-status-note is-ahead">
                    <TrendingUp size={14} />
                    <span>أنت متقدم عن الختمة بـ <strong>{formatPages(aheadPages)}</strong>{aheadUnits >= 0.1 && <> (≈ {toEasternArabic(aheadUnits)} {unitNoun})</>}.</span>
                  </p>
                )}
                {!todayDone && behindPages > 0 && (
                  <p className="wird-status-note is-behind">أنت متأخر عن الخطة بـ <strong>{formatPages(behindPages)}</strong>، والورد أدناه يشملها.</p>
                )}
                <div className="wird-range-box">
                  <div className="range-text">
                    {todayDone && <span className="wird-next-label">وردك القادم — اليوم {toEasternArabic(wirdEntry.day)}</span>}
                    {wirdIsFullDay ? (
                      <>
                        من {unitNoun === 'صفحة' ? 'صفحة' : `ال${unitNoun}`}{' '}
                        <strong>{toEasternArabic(wirdEntry.unitStart)}</strong> إلى <strong>{toEasternArabic(wirdEntry.unitEnd)}</strong>
                        <small className="wird-page-range">(الصفحات {toEasternArabic(wirdStart)}–{toEasternArabic(wirdEnd)})</small>
                      </>
                    ) : (
                      <>
                        من صفحة <strong>{toEasternArabic(wirdStart)}</strong> إلى <strong>{toEasternArabic(wirdEnd)}</strong>
                        <small className="wird-page-range">({formatPages(wirdEnd - wirdStart + 1)})</small>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="start-wird-btn"
                    onClick={() => {
                      onStartWird?.(wirdStart);
                      onClose();
                    }}
                  >
                    <span>{todayDone ? 'تقدّم في وردك القادم' : 'اقرأ وردك الآن'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </SpotlightCard>

          {/* Stats Grid */}
          <div className="khatma-stats-grid">
            <SpotlightCard className="stat-card" role="img" aria-label={`${toEasternArabic(progressPct)}٪ مكتمل، ${toEasternArabic(readPages)} صفحة مقروءة من 604`}>
              <StatRing value={`${toEasternArabic(progressPct)}٪`} label="مكتمل" percent={progressPct} />
            </SpotlightCard>

            <SpotlightCard className="stat-card" role="img" aria-label={`${toEasternArabic(totalPages - readPages)} صفحة متبقية للختم`}>
              <StatRing value={toEasternArabic(totalPages - readPages)} label="صفحة متبقية" percent={100 - progressPct} />
            </SpotlightCard>

            <SpotlightCard className="stat-card" role="img" aria-label={`${toEasternArabic(Math.ceil((totalPages - readPages) / pagesPerDay))} يومًا متوقعًا للإتمام`}>
              <StatRing value={toEasternArabic(Math.ceil((totalPages - readPages) / pagesPerDay))} label="يومًا متوقعًا" percent={progressPct} />
            </SpotlightCard>
          </div>
          <section className="khatma-schedule current-khatma-schedule" aria-label="جدول الختمة اليومي">
            <div className="khatma-schedule-head">
              <strong>جدول الورد اليومي — {unit === 'juz' ? 'بالأجزاء' : unit === 'hizb' ? 'بالأحزاب' : 'بالصفحات'}</strong>
              <span>{toEasternArabic(completedScheduleDays)} / {toEasternArabic(durationDays)} مكتمل</span>
            </div>
            <div className="khatma-schedule-list" role="list">
              {dailySchedule.map((entry) => (
                <div className={`khatma-schedule-row ${entry.completed ? 'is-complete' : ''}`} role="listitem" key={entry.day}>
                  <strong><span className="khatma-schedule-check" aria-label={entry.completed ? 'مكتمل' : 'غير مكتمل'}>{entry.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}</span>اليوم {toEasternArabic(entry.day)}</strong>
                  <span>{entry.unitStart ? `${unit === 'juz' ? 'الجزء' : unit === 'hizb' ? 'الحزب' : 'الصفحة'} ${toEasternArabic(entry.unitStart)}–${toEasternArabic(entry.unitEnd)}` : 'مراجعة أو راحة'}</span>
                  <small>{unit === 'page' ? (entry.completed ? 'أُنجز' : 'قيد القراءة') : `صفحات ${toEasternArabic(entry.pageStart)}–${toEasternArabic(entry.pageEnd)}`}</small>
                </div>
              ))}
            </div>
            <small className="khatma-schedule-note">{unit === 'page' ? 'توزعت صفحات المصحف بالتتابع على أيام الختمة.' : 'نطاق الصفحات موزع يوميًا، وتتتابع أرقام الأجزاء أو الأحزاب دون تكرار.'}</small>
          </section>
          </>}
          </div>

          <section className="khatma-create-section" aria-label="إنشاء أو تعديل خطة ختمة" hidden={activeSection !== 'create'}>
          {/* Goal Selector */}
          <div className="goal-selector-section">
            <label className="section-label">
              <Calendar size={16} />
              <span>مدة الختمة المستهدفة:</span>
            </label>
            <label className="section-label khatma-name-label" htmlFor="khatma-name">اسم الختمة:</label>
            <input id="khatma-name" className="khatma-days-input" type="text" maxLength="40" value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="مثال: ختمة رمضان" />
            <div className="duration-pill-row">
              {[7, 15, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  className={`duration-pill ${durationDays === days ? 'is-active' : ''}`}
                  onClick={() => selectPlan(unit, days)}
                >
                  {toEasternArabic(days)} يوم
                </button>
              ))}
            </div>
            <label className="section-label khatma-unit-label">
              <Target size={16} />
              <span>طريقة تقسيم الختمة:</span>
            </label>
            <div className="duration-pill-row">
              {[
                ['juz', 'بالجزء'],
                ['hizb', 'بالحزب'],
                ['page', 'بالصفحة'],
              ].map(([value, label]) => (
                <button key={value} type="button" className={`duration-pill ${unit === value ? 'is-active' : ''}`} onClick={() => selectPlan(value, durationDays)}>{label}</button>
              ))}
            </div>
            <div className="khatma-division-help" dir="rtl">
              <strong>كيف تُقسّم الختمة؟</strong>
              <p>المصحف 30 جزءًا، وكل جزء حزبين (60 حزبًا)، وعدد صفحاته 604.</p>
              <p>يحسب التطبيق وردك بقسمة العدد الكلي للوحدة المختارة على الأيام، ويعرض نطاق الصفحات المقابل لورد اليوم.</p>
              <small>مثال: ختمة في 30 يومًا = جزء واحد أو حزبان يوميًا تقريبًا، أي نحو 20 صفحة.</small>
            </div>
            <label className="section-label khatma-days-label" htmlFor="khatma-days">
              <Calendar size={16} />
              <span>أو أدخل عدد الأيام:</span>
            </label>
            <input id="khatma-days" className="khatma-days-input" type="number" min="1" max="365" step="1" value={customDaysInput} placeholder="أدخل عدد الأيام" onChange={(event) => {
              const value = event.target.value;
              setCustomDaysInput(value);
              if (value === '') return;
              const parsedDays = Number(value);
              if (Number.isFinite(parsedDays) && parsedDays > 0) {
                setDurationDays(Math.max(1, Math.min(365, Math.floor(parsedDays))));
              }
            }} />
          </div>
          </section>

          <section className="custom-wird-section" aria-label="إعداد ورد مخصص" hidden={activeSection !== 'customWird'}>
            <div className="custom-wird-heading">
              <span className="custom-wird-heading-icon"><ListMusic size={20} /></span>
              <div className="custom-wird-heading-copy">
                <span className="custom-wird-kicker">قراءة على وتيرتك</span>
                <strong>أنشئ وردك الخاص</strong>
                <p>اختر السور ورتّب عدد مرات قراءتها، وسنحفظ إعدادك للمرات القادمة.</p>
              </div>
              <span className="custom-wird-count-badge">{toEasternArabic(customWirdSurahs.length)} سور</span>
            </div>
            <div className="custom-wird-name-field">
              <label className="section-label custom-wird-name-label" htmlFor="custom-wird-name"><BookOpen size={15} /> اسم الورد</label>
              <input id="custom-wird-name" className="khatma-days-input" type="text" maxLength="40" value={customWirdName} onChange={(event) => setCustomWirdName(event.target.value)} placeholder="مثال: ورد الصباح" />
            </div>
            <div className="custom-wird-list">
              {customWirdSurahs.map((entry, index) => (
                <article className="custom-wird-row" key={entry.id}>
                  <div className="custom-wird-row-head">
                    <span className="custom-wird-row-index">{toEasternArabic(index + 1)}</span>
                    <div className="custom-wird-row-title">
                      <span>السورة {toEasternArabic(index + 1)}</span>
                      <strong>{SURAHS.find((surah) => surah.id === Number(entry.surah))?.name || 'اختر سورة'}</strong>
                    </div>
                    <button type="button" className="custom-wird-remove" onClick={() => setCustomWirdSurahs((rows) => rows.length > 1 ? rows.filter((row) => row.id !== entry.id) : rows)} aria-label={`حذف ${SURAHS.find((surah) => surah.id === Number(entry.surah))?.name || 'السورة'}`} title="إزالة السورة"><Trash2 size={15} /></button>
                  </div>
                  <div className="custom-wird-row-fields">
                    <Combobox.Root
                      items={SURAHS}
                      value={SURAHS.find((surah) => surah.id === Number(entry.surah)) || null}
                      open={openSurahPickerId === entry.id}
                      inputValue={openSurahPickerId === entry.id ? surahSearchTerm : ''}
                      itemToStringLabel={(surah) => `${surah.id} ${surah.name}`}
                      onOpenChange={(open) => {
                        setOpenSurahPickerId(open ? entry.id : '');
                        setSurahSearchTerm('');
                      }}
                      onInputValueChange={setSurahSearchTerm}
                      onValueChange={(surah) => {
                        if (!surah) return;
                        setCustomWirdSurahs((rows) => rows.map((row) => row.id === entry.id ? { ...row, surah: surah.id } : row));
                        setOpenSurahPickerId('');
                        setSurahSearchTerm('');
                      }}
                    >
                      <div className="custom-wird-surah-field">
                        <span>السورة</span>
                        <Combobox.Trigger className={`custom-wird-picker-trigger ${openSurahPickerId === entry.id ? 'is-open' : ''}`} aria-label="اختيار سورة">
                          <span>{toEasternArabic(entry.surah)} · {SURAHS.find((surah) => surah.id === Number(entry.surah))?.name || 'اختر سورة'}</span>
                          <ChevronDown size={15} />
                        </Combobox.Trigger>
                      </div>
                      <Combobox.Portal>
                        <Combobox.Positioner className="custom-wird-picker-positioner" side="bottom" align="start" sideOffset={6}>
                          <Combobox.Popup className="custom-wird-picker-menu">
                            <label className="custom-wird-picker-search"><Search size={14} /><Combobox.Input autoFocus type="search" placeholder="ابحث عن سورة…" aria-label="ابحث عن سورة" /></label>
                            <Combobox.Empty><p className="custom-wird-no-results">لا توجد سورة بهذا الاسم.</p></Combobox.Empty>
                            <Combobox.List className="custom-wird-picker-options">
                              {(surah) => (
                                <Combobox.Item key={surah.id} value={surah} className="custom-wird-picker-option">
                                  <span>{surah.name}</span><small>{toEasternArabic(surah.id)}</small>
                                </Combobox.Item>
                              )}
                            </Combobox.List>
                          </Combobox.Popup>
                        </Combobox.Positioner>
                      </Combobox.Portal>
                    </Combobox.Root>
                    <div className="custom-wird-repeat-field">
                      <span><Repeat2 size={13} /> عدد مرات القراءة</span>
                      <div className="custom-wird-stepper" dir="ltr">
                        <button type="button" aria-label="تقليل التكرار" onClick={() => setCustomWirdSurahs((rows) => rows.map((row) => row.id === entry.id ? { ...row, repeats: Math.max(1, (Number(row.repeats) || 1) - 1) } : row))}><Minus size={14} /></button>
                        <input type="number" inputMode="numeric" min="1" max="999" step="1" value={entry.repeats} aria-label={`عدد مرات تكرار ${SURAHS.find((surah) => surah.id === Number(entry.surah))?.name || 'السورة'}`} onChange={(event) => setCustomWirdSurahs((rows) => rows.map((row) => row.id === entry.id ? { ...row, repeats: event.target.value } : row))} onBlur={() => setCustomWirdSurahs((rows) => rows.map((row) => row.id === entry.id ? { ...row, repeats: Math.max(1, Math.min(999, Math.floor(Number(row.repeats) || 1))) } : row))} />
                        <button type="button" aria-label="زيادة التكرار" onClick={() => setCustomWirdSurahs((rows) => rows.map((row) => row.id === entry.id ? { ...row, repeats: Math.min(999, (Number(row.repeats) || 1) + 1) } : row))}><Plus size={14} /></button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <button type="button" className="custom-wird-add" onClick={() => setCustomWirdSurahs((rows) => [...rows, makeCustomWirdEntry((Number(rows[rows.length - 1]?.surah) || 0) + 1)])}><Plus size={17} /><span>إضافة سورة أخرى</span></button>
            <div className="custom-wird-summary">
              <span className="custom-wird-summary-icon"><Repeat2 size={16} /></span>
              <span className="custom-wird-summary-copy"><strong>إجمالي القراءات</strong><small>مجموع مرات قراءة السور في هذا الورد</small></span>
              <b>{toEasternArabic(customWirdSurahs.reduce((total, entry) => total + Math.max(1, Number(entry.repeats) || 1), 0))}</b>
            </div>
            <div className="custom-wird-actions">
              <button type="button" className="account-secondary custom-wird-save" onClick={saveCustomWirdPlan}><Save size={16} /> حفظ الإعداد</button>
              <button type="button" className="khatma-save-btn custom-wird-start" onClick={startCustomWird}><Play size={15} fill="currentColor" /> ابدأ الورد</button>
            </div>
            {savedCustomWirds.length > 0 && <button type="button" className="custom-wird-jump-saved" onClick={() => setActiveSection('saved')}><BookmarkCheck size={15} /><span>لديك {toEasternArabic(savedCustomWirds.length)} {savedCustomWirds.length === 1 ? 'ورد محفوظ' : 'أوراد محفوظة'} — تُعرض في قسم «المحفوظة»</span><ArrowRight size={14} /></button>}
          </section>
        </div>
        <div className="khatma-modal-actions" hidden={activeSection !== 'create'}>
          <button type="button" className="khatma-save-btn" onClick={savePlan} disabled={!isPlanDirty}>
            {creatingPlan ? 'حفظ الختمة الجديدة' : isPlanDirty ? 'حفظ تعديلات الختمة' : 'الإعدادات محفوظة'}
          </button>
        </div>
    </AccessibleDialog>
  );
}
