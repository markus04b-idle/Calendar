import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Apple,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Cloud,
  Download,
  Heart,
  MapPin,
  Plus,
  Settings2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  person: 'You' | 'Partner' | 'Together';
  color: string;
  busyOnly: boolean;
};

type Screen = 'calendar' | 'connections';
const STORAGE_KEY = 'together-calendar-events-v1';
const palette = ['#287965', '#d7785a', '#66839a', '#a17d45'];
const today = new Date();
const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function makeStarterEvents(): EventItem[] {
  const plusDays = (offset: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    return localDate(date);
  };
  return [
    { id: crypto.randomUUID(), title: 'Coffee and a walk', date: plusDays(0), time: '09:30', endTime: '10:30', location: 'Juniper & Co.', person: 'Together', color: palette[0], busyOnly: false },
    { id: crypto.randomUUID(), title: 'Project check-in', date: plusDays(0), time: '14:00', endTime: '14:45', location: '', person: 'You', color: palette[2], busyOnly: true },
    { id: crypto.randomUUID(), title: 'Dinner with Maya', date: plusDays(2), time: '19:00', endTime: '21:00', location: 'Little Fern', person: 'Together', color: palette[1], busyOnly: false },
    { id: crypto.randomUUID(), title: 'Dentist', date: plusDays(4), time: '11:00', endTime: '12:00', location: '', person: 'Partner', color: palette[3], busyOnly: true },
    { id: crypto.randomUUID(), title: 'Farmers market', date: plusDays(6), time: '10:00', endTime: '11:30', location: 'Riverside Market', person: 'Together', color: palette[0], busyOnly: false },
  ];
}

function readEvents(): EventItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) as EventItem[] : makeStarterEvents();
  } catch {
    return makeStarterEvents();
  }
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}

function prettyDate(value: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }) {
  return new Intl.DateTimeFormat('en', options).format(new Date(`${value}T12:00:00`));
}

function timeLabel(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2020, 0, 1, hours, minutes));
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function parseIcsDate(value: string) {
  const clean = value.replace(/[^0-9TZ]/g, '');
  if (clean.length < 8) return null;
  const date = `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  const time = clean.length >= 15 ? `${clean.slice(9, 11)}:${clean.slice(11, 13)}` : '09:00';
  return { date, time };
}

function App() {
  const [events, setEvents] = useState<EventItem[]>(readEvents);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localDate(today));
  const [screen, setScreen] = useState<Screen>('calendar');
  const [view, setView] = useState<'month' | 'agenda'>('month');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [installed, setInstalled] = useState(false);
  const [notice, setNotice] = useState('');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(events)), [events]);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const monthDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const selectedEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [events, selectedDate],
  );

  const monthEvents = useMemo(
    () => events.filter((event) => event.date.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`)),
    [events, month],
  );

  function changeMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function openNewEvent(date = selectedDate) {
    setEditing({ id: '', title: '', date, time: '09:00', endTime: '10:00', location: '', person: 'Together', color: palette[0], busyOnly: false });
    setShowForm(true);
  }

  function saveEvent(event: EventItem) {
    setEvents((current) => event.id ? current.map((item) => item.id === event.id ? event : item) : [...current, { ...event, id: crypto.randomUUID() }]);
    setSelectedDate(event.date);
    const date = new Date(`${event.date}T12:00:00`);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setShowForm(false);
    setNotice(event.id ? 'Plan updated' : 'Plan added');
  }

  function deleteEvent(id: string) {
    setEvents((current) => current.filter((event) => event.id !== id));
    setShowForm(false);
    setNotice('Plan removed');
  }

  function exportCalendar() {
    const entries = events.map((event) => {
      const stamp = `${event.date.replaceAll('-', '')}T${event.time.replace(':', '')}00`;
      const endStamp = `${event.date.replaceAll('-', '')}T${event.endTime.replace(':', '')}00`;
      const summary = event.busyOnly ? 'Busy' : escapeIcs(event.title);
      const location = event.busyOnly ? '' : `LOCATION:${escapeIcs(event.location)}\r\n`;
      return `BEGIN:VEVENT\r\nUID:${event.id}@together-calendar\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}\r\nDTSTART:${stamp}\r\nDTEND:${endStamp}\r\nSUMMARY:${summary}\r\n${location}END:VEVENT`;
    }).join('\r\n');
    const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Together Calendar//EN\r\n${entries}\r\nEND:VCALENDAR`], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'together-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Calendar file downloaded');
  }

  async function importCalendar(file?: File) {
    if (!file) return;
    const text = (await file.text()).replace(/\r?\n[ \t]/g, '');
    const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
    const imported: EventItem[] = [];
    for (const block of blocks) {
      const get = (name: string) => block.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'm'))?.[1]?.trim() ?? '';
      const start = parseIcsDate(get('DTSTART'));
      if (!start) continue;
      const end = parseIcsDate(get('DTEND'));
      const title = get('SUMMARY').replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, '\n') || 'Imported event';
      imported.push({
        id: crypto.randomUUID(), title, date: start.date, time: start.time,
        endTime: end?.time ?? '10:00', location: get('LOCATION'), person: 'You',
        color: palette[2], busyOnly: false,
      });
    }
    if (!imported.length) {
      setNotice('No readable events found in that file');
      return;
    }
    setEvents((current) => [...current, ...imported]);
    setSelectedDate(imported[0].date);
    const importedDate = new Date(`${imported[0].date}T12:00:00`);
    setMonth(new Date(importedDate.getFullYear(), importedDate.getMonth(), 1));
    setNotice(`${imported.length} ${imported.length === 1 ? 'event' : 'events'} imported`);
  }

  async function installApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      setInstallPrompt(null);
    } else {
      setInstalled(true);
    }
  }

  const displayName = prettyDate(selectedDate);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#calendar" onClick={() => setScreen('calendar')} aria-label="Together Calendar home">
          <span className="brand-mark"><Heart size={17} fill="currentColor" /></span>
          <span>Together<span className="brand-light"> calendar</span></span>
        </a>
        <div className="topbar-actions">
          <span className="local-badge"><span className="status-dot" /> On this device</span>
          <button className="icon-button install-button" onClick={installApp} aria-label="Install app" title="Install app">
            <ArrowDownToLine size={18} />
          </button>
          <button className="avatar-stack" onClick={() => setScreen('connections')} aria-label="Open calendar connections">
            <span className="avatar avatar-you">Y</span><span className="avatar avatar-partner">+</span>
          </button>
        </div>
      </header>

      <main className="main-layout">
        <aside className="sidebar">
          <div className="sidebar-heading">
            <div><p className="eyebrow">YOUR SHARED SPACE</p><h1>Make room<br />for <em>together.</em></h1></div>
            <span className="sparkle-mark"><Sparkles size={18} /></span>
          </div>
          <button className="create-button" onClick={() => openNewEvent()}><Plus size={18} strokeWidth={2.5} /> Add a plan</button>
          <div className="mini-calendar">
            <div className="mini-head">
              <strong>{monthLabel(month)}</strong>
              <div className="mini-nav">
                <button className="icon-button small" onClick={() => changeMonth(-1)} aria-label="Previous month"><ArrowLeft size={15} /></button>
                <button className="icon-button small" onClick={() => changeMonth(1)} aria-label="Next month"><ArrowRight size={15} /></button>
              </div>
            </div>
            <div className="mini-grid weekdays">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}${index}`}>{day}</span>)}</div>
            <div className="mini-grid">
              {monthDays.map((date) => {
                const key = localDate(date);
                const hasEvent = events.some((event) => event.date === key);
                return <button key={key} className={`mini-day ${date.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === selectedDate ? 'selected' : ''} ${key === localDate(today) ? 'today' : ''}`} onClick={() => setSelectedDate(key)} aria-label={prettyDate(key)}>
                  <span>{date.getDate()}</span>{hasEvent && <i />}
                </button>;
              })}
            </div>
          </div>
          <div className="people-block">
            <p className="eyebrow">PEOPLE</p>
            <div className="person-row"><span className="person-avatar you">Y</span><span>You</span><span className="person-caption">Your calendar</span></div>
            <div className="person-row"><span className="person-avatar partner">P</span><span>Partner</span><span className="person-caption">Not connected</span></div>
          </div>
          <div className="sidebar-note"><Cloud size={17} /><span>Plans are saved on this device. Connect calendars to share across devices.</span></div>
          <button className="sidebar-link" onClick={() => setScreen('connections')}><Settings2 size={16} /> Calendar connections <ArrowRight size={15} /></button>
        </aside>

        <section className="content-panel">
          {screen === 'calendar' ? <>
            <div className="content-toolbar">
              <div className="month-title-wrap">
                <button className="month-arrow" onClick={() => changeMonth(-1)} aria-label="Previous month"><ArrowLeft size={18} /></button>
                <h2>{monthLabel(month)}</h2>
                <button className="month-arrow" onClick={() => changeMonth(1)} aria-label="Next month"><ArrowRight size={18} /></button>
                <button className="today-button" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(localDate(today)); }}>Today</button>
              </div>
              <div className="view-switch" role="tablist" aria-label="Calendar view">
                <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')} role="tab" aria-selected={view === 'month'}>Month</button>
                <button className={view === 'agenda' ? 'active' : ''} onClick={() => setView('agenda')} role="tab" aria-selected={view === 'agenda'}>Agenda</button>
              </div>
            </div>
            {view === 'month' ? <div className="month-grid-wrap">
              <div className="month-grid weekday-row">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}</div>
              <div className="month-grid date-grid">
                {monthDays.map((date) => {
                  const key = localDate(date);
                  const dayEvents = events.filter((event) => event.date === key).sort((a, b) => a.time.localeCompare(b.time));
                  return <button key={key} className={`date-cell ${date.getMonth() !== month.getMonth() ? 'muted' : ''} ${selectedDate === key ? 'chosen' : ''}`} onClick={() => setSelectedDate(key)}>
                    <span className={`date-number ${key === localDate(today) ? 'current' : ''}`}>{date.getDate()}</span>
                    <span className="cell-events">{dayEvents.slice(0, 2).map((event) => <span key={event.id} className="event-chip" style={{ '--event-color': event.color } as CSSProperties}>{event.busyOnly ? 'Busy' : event.title}</span>)}{dayEvents.length > 2 && <span className="more-events">+{dayEvents.length - 2} more</span>}</span>
                    <span className="cell-add"><Plus size={14} /></span>
                  </button>;
                })}
              </div>
            </div> : <div className="agenda-list all-agenda">
              {monthEvents.length ? [...monthEvents].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).map((event) => <EventRow key={event.id} event={event} onClick={() => { setSelectedDate(event.date); setEditing(event); setShowForm(true); }} />) : <EmptyState onAdd={() => openNewEvent()} />}
            </div>}

            <section className="day-agenda">
              <div className="day-heading">
                <div><p className="eyebrow">YOUR PLANS</p><h3>{displayName}</h3></div>
                <button className="add-small" onClick={() => openNewEvent()}><Plus size={16} /><span>Add</span></button>
              </div>
              {selectedEvents.length ? <div className="agenda-list">{selectedEvents.map((event) => <EventRow key={event.id} event={event} onClick={() => { setEditing(event); setShowForm(true); }} />)}</div> : <EmptyState onAdd={() => openNewEvent()} />}
            </section>
            <div className="mobile-sync-note"><Cloud size={16} /><span>Saved on this device only</span><button onClick={() => setScreen('connections')}>Set up sync <ArrowRight size={13} /></button></div>
          </> : <Connections onImport={() => fileRef.current?.click()} onExport={exportCalendar} />}
        </section>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={screen === 'calendar' ? 'active' : ''} onClick={() => setScreen('calendar')}><CalendarDays size={20} /><span>Calendar</span></button>
        <button className="nav-add" onClick={() => openNewEvent()} aria-label="Add a plan"><Plus size={23} /></button>
        <button className={screen === 'connections' ? 'active' : ''} onClick={() => setScreen('connections')}><Cloud size={20} /><span>Sync</span></button>
      </nav>

      <input ref={fileRef} className="visually-hidden" type="file" accept=".ics,text/calendar" onChange={(event) => { void importCalendar(event.target.files?.[0]); event.target.value = ''; }} />
      {showForm && editing && <EventForm event={editing} onClose={() => setShowForm(false)} onSave={saveEvent} onDelete={deleteEvent} />}
      {notice && <div className="toast" role="status"><Check size={16} />{notice}</div>}
      {installed && <div className="install-hint" role="status"><button className="hint-close" onClick={() => setInstalled(false)} aria-label="Close"><X size={16} /></button><strong>Add to Home Screen</strong><span>Open your browser menu and choose “Add to Home Screen” to install Together Calendar.</span></div>}
    </div>
  );
}

export default App;

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

function EventRow({ event, onClick }: { event: EventItem; onClick: () => void }) {
  return <button className="event-row" onClick={onClick}>
    <span className="event-time">{timeLabel(event.time)}<small>{timeLabel(event.endTime)}</small></span>
    <span className="event-color" style={{ backgroundColor: event.color }} />
    <span className="event-copy"><strong>{event.busyOnly ? 'Busy' : event.title}</strong><small>{event.busyOnly ? 'Private event' : event.location || event.person}</small></span>
    <span className={`event-person ${event.person.toLowerCase()}`}>{event.person === 'Together' ? <Heart size={14} fill="currentColor" /> : event.person.slice(0, 1)}</span>
    <ChevronDown className="row-chevron" size={16} />
  </button>;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><Sparkles size={19} /></span><strong>A little breathing room.</strong><span>Nothing on the calendar yet.</span><button onClick={onAdd}><Plus size={15} /> Add a plan</button></div>;
}

function Connections({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  return <div className="connections-page">
    <div className="connections-intro"><span className="eyebrow">CALENDAR SETTINGS</span><h2>Bring your calendars<br /><em>into the picture.</em></h2><p>This first version keeps plans on this device. Import or export calendar files now; account sync will need a secure hosted service and provider setup.</p></div>
    <div className="connection-status"><span className="status-ring"><Cloud size={20} /></span><div><strong>No accounts connected</strong><small>Events are stored in this browser only</small></div><span className="disconnected-pill">Not synced</span></div>
    <div className="provider-list">
      <div className="provider-row"><span className="provider-icon google-icon">G</span><div className="provider-copy"><strong>Google Calendar</strong><small>Two-way sync requires Google OAuth setup on a hosted server.</small></div><span className="provider-state">Setup needed</span></div>
      <div className="provider-row"><span className="provider-icon apple-icon"><Apple size={20} /></span><div className="provider-copy"><strong>Apple Calendar</strong><small>iCloud sync requires CalDAV and an app-specific password.</small></div><span className="provider-state">Setup needed</span></div>
    </div>
    <div className="file-tools"><div><span className="eyebrow">CALENDAR FILES</span><strong>Move plans in or out</strong><p>Import an .ics file, or download your current plans to add them to another calendar.</p></div><div className="file-actions"><button onClick={onImport}><Upload size={16} /> Import .ics</button><button className="secondary-action" onClick={onExport}><Download size={16} /> Export .ics</button></div></div>
    <div className="privacy-note"><span><Heart size={17} /></span><p><strong>Privacy stays in your hands.</strong> Mark an event “busy only” to hide its title and location in the exported calendar file.</p></div>
    <div className="setup-note"><Clock3 size={15} /><span>For true two-person, two-way sync, this app needs sign-in, a shared backend, and provider credentials. No accounts are connected yet.</span></div>
  </div>;
}

function EventForm({ event, onClose, onSave, onDelete }: { event: EventItem; onClose: () => void; onSave: (event: EventItem) => void; onDelete: (id: string) => void }) {
  const [form, setForm] = useState(event);
  const update = (key: keyof EventItem, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="event-modal" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
      <div className="modal-header"><div><span className="eyebrow">{form.id ? 'EDIT PLAN' : 'NEW PLAN'}</span><h2>{form.id ? 'A plan together' : 'Make a plan'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <label className="field-label">What’s the plan?<input autoFocus required maxLength={80} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Dinner, a walk, anything…" /></label>
      <div className="form-row"><label className="field-label">Date<input type="date" required value={form.date} onChange={(event) => update('date', event.target.value)} /></label><label className="field-label">Who’s it for?<select value={form.person} onChange={(event) => update('person', event.target.value)}><option>You</option><option>Partner</option><option>Together</option></select></label></div>
      <div className="form-row"><label className="field-label">Starts<input type="time" required value={form.time} onChange={(event) => update('time', event.target.value)} /></label><label className="field-label">Ends<input type="time" required value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></label></div>
      <label className="field-label location-field"><span>Where?</span><span className="input-with-icon"><MapPin size={16} /><input value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Add a place (optional)" /></span></label>
      <div className="field-label color-label"><span>Calendar color</span><div className="color-options">{palette.map((color) => <button type="button" key={color} aria-label={`Choose ${color} color`} className={`color-swatch ${form.color === color ? 'chosen' : ''}`} style={{ background: color }} onClick={() => update('color', color)}>{form.color === color && <Check size={14} />}</button>)}</div></div>
      <label className="privacy-toggle"><span className="privacy-symbol"><Heart size={16} /></span><span><strong>Show as busy only</strong><small>Hide the event name and location when exported</small></span><input type="checkbox" checked={form.busyOnly} onChange={(event) => update('busyOnly', event.target.checked)} /></label>
      <div className="modal-actions">{form.id && <button type="button" className="delete-button" onClick={() => onDelete(form.id)}>Delete</button>}<button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button className="save-button" type="submit">Save plan</button></div>
    </form>
  </div>;
}