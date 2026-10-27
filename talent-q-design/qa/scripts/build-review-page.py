# Builds the single-file direction review page that is published privately as an Artifact.
# Usage (from prototype/): VITE_START=/x npx vite build -c vite.review.config.ts && python3 ../qa/scripts/build-review-page.py <out.html>
import glob, re, sys
d = 'dist-review/assets'
js = open(glob.glob(d + '/*.js')[0]).read()
css = open(glob.glob(d + '/*.css')[0]).read()
# Drop non-latin font subsets to keep the page small (all copy is English).
css = re.sub(r'@font-face\{[^}]*\}', lambda m: m.group(0) if (re.search(r'unicode-range:U\+0000-00FF', m.group(0)) or 'unicode-range' not in m.group(0)) else '', css)
page = f'''<title>Talent Q Directions</title>
<meta name="theme-color" content="#0b0a08">
<style>{css}</style>
<div id="root"></div>
<script type="module">{js.replace('</script', '<\\/script')}</script>
'''
open(sys.argv[1], 'w').write(page)
print(round(len(page) / 1e6, 2), 'MB')
