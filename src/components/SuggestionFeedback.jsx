import React, { useState } from 'react';
import { Lightbulb, Send, X } from 'lucide-react';
import AccessibleDialog from './ui/AccessibleDialog';
import './SuggestionFeedback.css';

const SUPPORT_EMAIL = 'Benhmed8khadija@gmail.com';

export default function SuggestionFeedback({ className = '', label = 'أرسل اقتراحك', iconOnly = false }) {
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const sendSuggestion = (event) => {
    event.preventDefault();
    const message = suggestion.trim();
    if (!message) return;
    const subject = encodeURIComponent('اقتراح لتطبيق تلاوة و ختم');
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label} title={iconOnly ? label : undefined}>
        <Lightbulb size={17} />{!iconOnly && label}
      </button>
      <AccessibleDialog open={open} onClose={() => setOpen(false)} label="شاركنا اقتراحك" backdropClassName="suggestion-overlay" popupClassName="suggestion-dialog">
        <div className="suggestion-heading">
          <span className="suggestion-heading-icon"><Lightbulb size={19} /></span>
          <div><h2>شاركنا اقتراحك</h2><p>ما الذي يجعل تجربتك مع تلاوة و ختم أفضل؟</p></div>
          <button type="button" className="suggestion-close" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <form onSubmit={sendSuggestion}>
          <label className="suggestion-label" htmlFor="app-suggestion">اقتراحك</label>
          <textarea id="app-suggestion" autoFocus maxLength={3000} rows={5} value={suggestion} onChange={(event) => setSuggestion(event.target.value)} placeholder="اكتب اقتراحك هنا…" required />
          <div className="suggestion-form-footer"><small>سيُفتح تطبيق البريد لديك لمراجعة الرسالة وإرسالها.</small><button type="submit" disabled={!suggestion.trim()}><Send size={15} /> تجهيز الرسالة</button></div>
        </form>
      </AccessibleDialog>
    </>
  );
}
