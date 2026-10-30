# Builds the founder review gallery: compresses pairs, final screens and clips, writes data into the template.
# Inputs: capture-all.mjs output, motion-clips.mjs output (webm), and a `vite build --base ./` of the prototype.
# usage: python3 build.py <final-captures-dir> <clips-dir> <app-dist-dir> <out-dir>
import sys, os, re, json, glob, shutil, subprocess
from PIL import Image

ROOT = '/home/user/neo/talent-q-design'
cap, clips, app, out = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)

def webp(src, dst, width, max_h=None, crop_h=None):
    im = Image.open(src).convert('RGB'); w, h = im.size
    if crop_h: im = im.crop((0, 0, w, min(h, crop_h))); h = im.size[1]
    if w > width: im = im.resize((width, round(h * width / w)), Image.LANCZOS)
    if max_h and im.size[1] > max_h: im = im.crop((0, 0, im.size[0], max_h))
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, 'WEBP', quality=76, method=6)
    return im.size

# ---- areas, journeys and the before/after captions from each area's design notes
AREAS = [
    ('hire-a', 'R1 · R5', 'Founder hiring and the hiring manager', 'Funmi, a founder with no recruiting words, and Bayo, a head of engineering'),
    ('hire-b', 'R2', 'Comparing evidence and interviewing', 'Ada, a talent partner at Kora Pay'),
    ('hire-c', 'R3', 'Messages, calendar and pipeline', 'Ngozi and Ada at Kora Pay'),
    ('agency', 'R4', 'The agency with two clients', 'Dele at Talentbridge, recruiting for Kora Pay and Medlink'),
    ('talent-a', 'T1 · T2', 'First profile and the career atlas', 'Amaka, a graduate, and Chidi, a salesperson moving into product'),
    ('talent-b', 'T3 · T5', 'Evidence Passport, jobs and privacy', 'Tobi, a backend engineer, and Zara, who wants control of who sees her'),
    ('talent-c', 'T4', 'The interview room on a phone', 'Grace, a care assistant on a slow phone connection'),
    ('email', 'J11 · E-01', 'Connected email and candidate contact', 'Ada’s Google Workspace mailbox, Kora’s contact policy, Tobi’s question'),
    ('campaigns', 'J11 · §D', 'Hiring campaigns', 'Kora’s Q4 Engineering Expansion and Talentbridge’s client campaigns'),
    ('rubric', 'J11 · §E', 'Evaluation rubrics and scoring', 'Ada agreeing how to judge Senior Backend, and Tobi’s scorecard'),
    ('media', 'J11 · §F', 'Video and voice evidence', 'Tobi’s consented walkthrough and Ada’s evidence report'),
    ('evidence-recruiter', 'J12', 'Evidence-first hiring: the recruiter', 'Ada finding people by what they have shown, not by CV wording'),
    ('evidence-candidate', 'J12', 'Evidence-first hiring: the candidate', 'Seyi Okoro’s bounded sample and Tobi’s way forward'),
]
def captions(area):
    md = open(f'{ROOT}/journeys/design/{area}.md').read()
    m = re.search(r'^## [^\n]*[Pp]airs[^\n]*\n(.*?)(?=^## |\Z)', md, re.S | re.M)
    if not m: return {}
    sec = m.group(1)
    items = re.findall(r'^- (\d\d):?\s*(.*?)(?=^- |^\S|\Z)', sec, re.S | re.M)
    return {n: re.sub(r'\s+', ' ', t).strip().replace('`', '') for n, t in items}

areas = []
for key, jn, title, who in AREAS:
    cap_text = captions(key); pairs = []
    for b in sorted(glob.glob(f'{ROOT}/captures/review/pairs/{key}/*-before.png')):
        n = os.path.basename(b)[:2]; a = b.replace('-before', '-after')
        phone = Image.open(b).size[0] < 1000
        sizes = {}
        for side, src in (('before', b), ('after', a)):
            sizes[side] = webp(src, f'{out}/pairs/{key}/{n}-{side}.webp', 780 if phone else 1280, max_h=2600)
        pairs.append({'n': n, 'phone': phone, 'text': cap_text.get(n, ''), 'size': sizes})
    # Second layout: pairs/<area>/before/<name>.png and after/<name>.png (same file names), captioned by name.
    for b in sorted(glob.glob(f'{ROOT}/captures/review/pairs/{key}/before/*.png')):
        name = os.path.basename(b)[:-4]; a = b.replace('/before/', '/after/')
        if not os.path.exists(a): continue
        phone = Image.open(b).size[0] < 1000; sizes = {}
        for side, src in (('before', b), ('after', a)):
            sizes[side] = webp(src, f'{out}/pairs/{key}/{name}-{side}.webp', 780 if phone else 1280, max_h=2600)
        label = re.sub(r'^[dm]-\d+-', '', name).replace('-', ' ')
        pairs.append({'n': name, 'phone': phone, 'text': ('Phone · ' if phone else 'Desktop · ') + label[:1].upper() + label[1:], 'size': sizes})
    areas.append({'key': key, 'journeys': jn, 'title': title, 'who': who, 'pairs': pairs})

# ---- every screen now, from the final build
PEOPLE = {
    'u_funmi': ('R1', 'Funmi', 'Founder, Crumb & Co'), 'u_ada': ('R2 · R3', 'Ada', 'Talent partner, Kora Pay'),
    'u_bayo': ('R5', 'Bayo', 'Hiring manager, Kora Pay'), 'u_dele': ('R4', 'Dele', 'Agency director, Talentbridge'),
    'p_amaka': ('T1', 'Amaka', 'Graduate'), 'p_chidi': ('T2', 'Chidi', 'Sales executive'),
    'p_tobi': ('T3', 'Tobi', 'Backend engineer'), 'p_grace': ('T4', 'Grace', 'Care assistant'),
    'p_zara': ('T5', 'Zara', 'Backend engineer'), 'p_seyio': ('J12', 'Seyi Okoro', 'Backend engineer, polished CV'), 'public': ('—', 'Anyone', 'Sign-up and the states gallery'),
}
screens = []
for vp in ('desktop', 'phone'):
    for f in sorted(glob.glob(f'{cap}/{vp}/*.png')):
        name = os.path.basename(f)[:-4]
        person = next((p for p in PEOPLE if name.startswith(p + '_')), None)
        if not person: continue
        route = '/' + name[len(person) + 1:].replace('_', '/')
        route = route.replace('/c/jobs/j/kora/backend', '/c/jobs/j_kora_backend').replace('/client/org/kora', '/client/org_kora').replace('/mandate/m/ops', '/mandate/m_ops').replace('/people/p/tobi', '/people/p_tobi').replace('/calendar/connect', '/calendar/connect')
        full = webp(f, f'{out}/screens/{vp}/{name}.webp', 1280 if vp == 'desktop' else 780, max_h=5200)
        # One file per screen (the publish limit is 511 files): the grid shows the top of the full image.
        tw = 480 if vp == 'desktop' else 260; ch = 900 if vp == 'desktop' else 1688
        thumb = (tw, round(min(full[1] * tw / full[0], ch * tw / (1440 if vp == 'desktop' else 780))))
        screens.append({'vp': vp, 'id': name, 'person': person, 'route': route, 'thumb': thumb, 'full': full})

# ---- motion previews
CLIPS = [
    ('01-navigate-and-return', 'Leave and come back', 'Ada asks to see everything about Tobi. Q opens his profile, then “go back to the comparison” returns her to it exactly as she left it.', 'R2', 'u_ada', '/r/compare'),
    ('02-draft-revise-send', 'Draft, change, approve, send', 'An interview invitation drafted, changed to Friday and a friendlier tone with a visible diff, approved, then sent (simulated) with a receipt.', 'R3', 'u_ada', '/r/people/p_tobi'),
    ('03-proactive-card', 'Q notices, and says why', 'A “Q noticed” card on Ngozi’s messages: why it appeared, then “Later” puts it away for a day.', 'R3', 'u_ngozi', '/r/messages'),
    ('04-upload-drop-resume', 'Upload survives a dropped connection', 'On a phone, Grace’s certificate upload pauses when the connection drops and carries on from the same part when it’s back.', 'T4', 'p_grace', '/c/start'),
    ('05-interview-follow-up', 'Adaptive follow-up', 'Tobi gives a thin answer and gets one follow-up he can skip. The fuller answer moves straight on.', 'T4', 'p_tobi', '/c/interview'),
    ('06-agents-interrupt', 'Agents, interrupted and resumed', 'Dele pauses the Medlink search because Kora is urgent, then resumes it from the same point. Nothing finished is repeated.', 'R4', 'u_dele', '/r/agency/agents'),
    ('07-career-goal-change', 'Changing your mind', 'Chidi switches his goal from product manager to business analyst. The plan re-routes and his earlier work is kept.', 'T2', 'p_chidi', '/c/career'),
    ('08-privacy-refusal', 'A refusal that reveals nothing', 'Dele asks for Zara’s profile. Q declines without saying whether there is anything to see.', 'R4', 'u_dele', '/r/home'),
    ('09-candidate-home-phone', 'Grace’s home on a phone', 'The next commitment first, then where she is, with Q one tap away.', 'T4', 'p_grace', '/c/home'),
]
motion = []
os.makedirs(f'{out}/motion', exist_ok=True)
for cid, t, d, j, who, route in CLIPS:
    src = f'{clips}/{cid}.webm'
    if not os.path.exists(src): continue
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-crf', '27', '-an', f'{out}/motion/{cid}.mp4'], check=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', '1.6', '-i', src, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '5', f'{out}/motion/{cid}.jpg'], check=True)
    phone = cid.startswith(('04', '09'))
    motion.append({'id': cid, 'title': t, 'text': d, 'journey': j, 'phone': phone, 'as': who, 'route': route})

# ---- films: the connected journey and the email clip (recorded from the tested build)
FILM_DIR = os.environ.get('FILMS', f'{ROOT}/captures/films/J11')
FILM_DIRS = {'J12-evidence-first': f'{ROOT}/captures/films/J12'}
films = []
os.makedirs(f'{out}/films', exist_ok=True)
for fid, title, text in [('J12-evidence-first', 'J12 · Evidence-first hiring', 'Tobi’s CV is thin; his reviewed work shows Postgres. Seyi Okoro’s CV is polished; most of it is still claims. Q finds both by what they have shown, sets out CV against evidence, asks Seyi Okoro for one 40-minute sample instead of a full test, and both move to interview. Then Tobi stops sharing an item and Ada’s views update.'),
                         ('J11-connected-journey', 'J11 · One connected journey', 'Tobi watches the role briefing and asks Kora a question; Ada files it in the Q4 campaign, agrees a rubric, reviews Tobi’s consented walkthrough and emails an invitation; Tobi replies and it’s booked. Six disruptions on the way.'),
                         ('E01-email-clip', 'Email: request to booking', 'Ask Q to email an invitation → the draft names sender and campaign → approve the exact content → Google sign-in expired → reconnect → sent once → reply with a new subject → confirm → booked.')]:
    for v in ('desktop', 'phone'):
        src = f'{FILM_DIRS.get(fid, FILM_DIR)}/{fid}-{v}.mp4'
        if not os.path.exists(src): continue
        # Web copy under the 15 MB per-file publish limit; full-quality masters stay in captures/films/J11.
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-vf', 'scale=-2:720' if v == 'desktop' else 'scale=-2:1280', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', f'{out}/films/{fid}-{v}.mp4'], check=True)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', '20', '-i', src, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '5', f'{out}/films/{fid}-{v}.jpg'], check=True)
        films.append({'id': f'{fid}-{v}', 'title': title, 'text': text, 'phone': v == 'phone'})

# ---- the prototype itself, as a second page
shutil.copytree(app, f'{out}/app')

data = {'areas': areas, 'screens': screens, 'people': PEOPLE, 'motion': motion, 'films': films}
html = open(f'{here}/template.html').read().replace('/*__DATA__*/null', json.dumps(data, ensure_ascii=False))
open(f'{out}/index.html', 'w').write(html)
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(out) for f in fs)
print(f"{len(areas)} areas, {sum(len(a['pairs']) for a in areas)} pairs, {len(screens)} screens, {len(motion)} clips, {total/1e6:.1f} MB, {sum(len(fs) for _, _, fs in os.walk(out))} files")
