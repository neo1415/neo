// Proactive help for T4 (Grace), from real state only: a paused or failed upload, tomorrow's interview,
// a slow connection, and a step she left halfway. Each says why it appears; dismiss and snooze are the engine's.
import { simNow } from '../../mock/world';
import { registerRule } from '../core/proactive';
import { readPersonC } from '../../state/areas/talent-c';
import { uploadPct, whereLine } from '../../journeys/talent-c/runtime';
import { bankFor, timeText } from '../../journeys/talent-c/questions';

registerRule({
  id: 'talent-c.upload', side: 'candidate', priority: 'high',
  evaluate: (w, a) => {
    const u = readPersonC(w, a.personId).upload;
    if (!u || (u.status !== 'PAUSED' && u.status !== 'FAILED') || u.done === 0) return [];
    const p = uploadPct(u);
    const why = u.reason === 'OFFLINE' ? 'Your connection dropped while it was sending.' : u.reason === 'CLOSED' ? 'The app was closed while it was sending.' : u.reason === 'SERVER' ? `Part ${u.done + 1} didn’t go through.` : u.reason === 'NEED_FILE' ? 'The app was closed, so the photo needs choosing again.' : 'You paused it.';
    return [{ subject: `upload:${u.startedAt}:${u.status}`, text: `Your certificate upload is ${u.status === 'FAILED' ? 'stopped' : 'paused'} at ${p}%. The first ${u.done} parts are safe; it carries on from there.`, why: `${why} ${u.done} of ${u.chunks} parts were received.`,
      actions: w.network === 'offline' ? [] : [{ label: `Carry on from ${p}%`, primary: true, act: { t: 'do', op: 'talent-c.upload.resume' } }] }];
  },
});

registerRule({
  id: 'talent-c.interview-soon', side: 'candidate', priority: 'high',
  evaluate: (w, a) => {
    const pid = a.personId; if (!pid) return [];
    const bank = bankFor(w, pid, null); if (!bank.when || !bank.eventId) return [];
    const me = readPersonC(w, pid);
    const hours = (new Date(bank.when).getTime() - simNow(w).getTime()) / 36e5;
    if (hours <= 0 || hours > 36 || me.practicesDone > 0 || me.rooms.REAL?.submitted) return [];
    const day = new Date(bank.when).toDateString() === new Date(simNow(w).getTime() + 864e5).toDateString() ? 'tomorrow' : 'soon';
    return [{ subject: `${bank.eventId}`, text: `Your interview with ${bank.org} is ${day} at ${timeText(bank.when, a.timezone)}. Want a quick practice? It’s private and never counts.`, why: `Your calendar has the ${bank.org} interview in ${Math.round(hours)} hours, and you haven’t practised yet.`,
      actions: [{ label: 'Quick practice', primary: true, act: { t: 'say', text: 'practice for my interview' } }] }];
  },
});

registerRule({
  id: 'talent-c.slow', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    const pid = a.personId; if (!pid) return [];
    const me = readPersonC(w, pid);
    if (!me.slow || w.consents[pid]?.lite) return [];
    return [{ subject: 'lite', text: 'Your connection seems slow. Try lite mode? It uses less data: fewer pictures, no animations, bigger buttons.', why: me.upload?.lastChunkMs && me.upload.lastChunkMs > 1000 ? `Each part of your upload is taking about ${Math.round(me.upload.lastChunkMs / 100) / 10} seconds.` : 'Your phone or the demo reports a slow connection.',
      actions: [{ label: 'Turn on lite mode', primary: true, act: { t: 'do', op: 'talent-c.lite', args: { on: true } } }] }];
  },
});

registerRule({
  id: 'talent-c.left', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    const pid = a.personId; if (!pid) return [];
    const me = readPersonC(w, pid);
    if (!me.place?.left) return [];
    return [{ subject: `${me.place.route}:${me.place.at}`, text: `You stopped halfway: ${whereLine(me)}. Carry on?`, why: 'You left that page before finishing. Everything you’d done is saved.',
      actions: [{ label: 'Carry on', primary: true, act: { t: 'do', op: 'talent-c.continue' } }] }];
  },
});

registerRule({
  id: 'talent-c.first-steps', side: 'candidate', priority: 'normal',
  evaluate: (w, a) => {
    const pid = a.personId; if (!pid || !w.q.prefs[a.id]?.plain) return [];
    const me = readPersonC(w, pid);
    if (me.place || me.stepsDone.length) return [];
    return [{ subject: 'start', text: 'Shall we start with three small steps? Your work, your certificate, your interview. About five minutes, and you can stop any time.', why: 'You’ve just joined and chose plain, simple words.',
      actions: [{ label: 'Start', primary: true, act: { t: 'nav', to: '/c/start' } }] }];
  },
});
