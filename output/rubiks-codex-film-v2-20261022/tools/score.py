from pathlib import Path
from functools import lru_cache
import hashlib, json, math, re, subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT/'src/timeline.json').read_text())
EVENTS = json.loads((ROOT/'out/events.json').read_text())
SC = {s['id']:s for s in T['scenes']}
SR, N = 48000, round(T['duration']*48000)
OUT = ROOT/'audio'
RNG = np.random.default_rng(2026102202)
VOICE = np.zeros(N,np.float32)
HARM = np.zeros((N,2),np.float32)
LEAD = np.zeros((N,2),np.float32)
RHYTHM = np.zeros((N,2),np.float32)
FX = np.zeros((N,2),np.float32)
DUCK = np.ones(N,np.float32)

def run(args,data=None):
    return subprocess.run(args,input=data,capture_output=True,check=True)
def write(path,samples):
    channels=1 if samples.ndim==1 else samples.shape[1]
    run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac',str(channels),'-i','-','-c:a','pcm_f32le',str(path)],np.asarray(samples,dtype='<f4').tobytes())
def place(target,signal,at,gain=1,pan=0):
    a=round(at*SR); skip=max(0,-a); a=max(0,a)
    count=min(len(signal)-skip,len(target)-a)
    if count<=0:return
    signal=signal[skip:skip+count]
    if target.ndim==1:target[a:a+count]+=signal*gain
    else:
        target[a:a+count,0]+=signal*gain*math.sqrt((1-pan)/2)
        target[a:a+count,1]+=signal*gain*math.sqrt((1+pan)/2)
def hz(note):return 440*2**((note-69)/12)
def clock(duration):return np.arange(round(duration*SR),dtype=np.float32)/SR
def envelope(t,duration,attack,decay):
    return np.minimum(1,t/max(.001,attack))*np.exp(-t/decay)*np.minimum(1,np.maximum(0,duration-t)/.06)

@lru_cache(maxsize=400)
def tone(note,duration,kind='keys'):
    t=clock(duration); f=hz(note)
    if kind=='keys':
        mod=1.25*np.exp(-t*7)*np.sin(2*np.pi*f*2*t)
        wave=(np.sin(2*np.pi*f*t+mod)+.22*np.sin(2*np.pi*f*3*t)*np.exp(-t*7))
        env=envelope(t,duration,.005,.65)
    elif kind=='marimba':
        wave=np.sin(2*np.pi*f*t+1.1*np.sin(2*np.pi*f*3*t)*np.exp(-t*13))+.18*np.sin(2*np.pi*f*4*t)*np.exp(-t*18)
        env=envelope(t,duration,.003,.28)
    elif kind=='pluck':
        wave=sum(np.sin(2*np.pi*f*k*t)*np.exp(-t*k*3)/k for k in range(1,7))
        env=envelope(t,duration,.004,.38)
    elif kind=='bass':
        wave=np.sin(2*np.pi*f*t)+.55*np.sin(2*np.pi*f*2*t)+.24*np.sin(2*np.pi*f*3*t)+.12*np.sin(2*np.pi*f*4*t)
        env=envelope(t,duration,.008,.34)
    else:
        wave=.55*np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*1.003*t+.4)+.16*np.sin(2*np.pi*f*2*t)
        env=np.minimum(1,t/.25)*np.minimum(1,np.maximum(0,duration-t)/.65)
    return (wave*env).astype(np.float32)

@lru_cache(maxsize=4)
def drum(kind):
    duration={'kick':.34,'snare':.23,'hat':.075,'open':.24}[kind];t=clock(duration)
    noise=RNG.normal(0,1,len(t)).astype(np.float32)
    high=noise-np.convolve(noise,np.ones(18)/18,mode='same')
    if kind=='kick':
        phase=2*np.pi*(52*t+65*(1-np.exp(-t*35))/35)
        wave=np.sin(phase)*np.exp(-t*17)+.16*np.sin(2*phase)*np.exp(-t*25)+high*.08*np.exp(-t*150)
    elif kind=='snare':
        wave=(.45*high+.28*np.sin(2*np.pi*185*t))*np.exp(-t*22)+noise*.12*np.exp(-t*55)
    else:
        wave=high*np.exp(-t*(70 if kind=='hat' else 20))*.35
    return (wave*np.minimum(1,t/.0006)).astype(np.float32)

active=[]
for s in T['scenes']:
    p=ROOT/s['audio']['file'];assert hashlib.sha256(p.read_bytes()).hexdigest()==s['audio']['sha256']
    raw=run(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-ac','1','-ar',str(SR),'-']).stdout
    voice=np.frombuffer(raw,dtype='<f4');place(VOICE,voice,s['start']);active.append(voice)
    # 3.5 dB ducking, with a smooth recovery into the planned musical gaps.
    a,b=round(s['start']*SR),min(N,round((s['start']+len(voice)/SR)*SR))
    DUCK[a:b]=.67
    r=round(.16*SR);lo,hi=max(0,a-r),min(N,b+r)
    DUCK[lo:a]=np.minimum(DUCK[lo:a],np.linspace(1,.67,a-lo,endpoint=False))
    DUCK[b:hi]=np.minimum(DUCK[b:hi],np.linspace(.67,1,hi-b,endpoint=False))
reference=np.concatenate(active)
voice_gain=min(.105/np.sqrt(np.mean(reference**2)),.72/np.max(np.abs(reference)))
VOICE*=voice_gain

# Original recurring four-note motif; the last return changes C to C-sharp.
CHORDS=[[50,53,57,64],[46,53,57,62],[48,53,57,64],[45,52,55,61]]
ROOTS=[38,34,41,33]
MOTIF=[74,69,72,74,77,76,72,69]
sections=[
    ('suspense',0,SC['history']['start'],112,.55),
    ('origin',SC['history']['start'],SC['pieces']['start'],96,.35),
    ('explore',SC['pieces']['start'],SC['metric']['start'],104,.60),
    ('proof',SC['metric']['start'],SC['lbl']['start'],112,.80),
    ('methods',SC['lbl']['start'],SC['inspection']['start'],124,1.00),
    ('planning',SC['inspection']['start'],SC['average']['start'],104,.25),
    ('competition',SC['average']['start'],SC['ending']['start'],120,.90),
]
for name,start,end,bpm,energy in sections:
    beat=60/bpm;bar=beat*4
    for bar_i in range(math.ceil((end-start)/bar)):
        at=start+bar_i*bar
        if at>=end:break
        chord=CHORDS[bar_i%4]; root=ROOTS[bar_i%4]
        dur=min(bar+.45,end-at+.3)
        for i,n in enumerate(chord):place(HARM,tone(n,dur,'pad'),at,.052,(i-1.5)*.28)
        for eighth in range(8):
            when=at+eighth*beat/2
            if when>=end-.08:break
            if name in ['origin','planning'] and eighth%2:continue
            note=chord[[0,2,1,3,2,1,3,2][eighth]]+12
            instrument='marimba' if name in ['origin','explore','planning'] else 'pluck'
            amp=.085*energy*(1 if eighth%2==0 else .7)
            place(LEAD,tone(note,.62,instrument),when,amp,.38 if eighth%2 else -.38)
            if name not in ['origin','planning']:
                place(RHYTHM,drum('hat'),when,.060*energy*(.75 if eighth%2 else .5),.24 if eighth%2 else -.16)
        for k in [0,1.5,2,3.5]:
            when=at+k*beat
            if when>=end-.08:continue
            place(HARM,tone(root+(12 if k==3.5 else 0),beat*.8,'bass'),when,.13*energy,0)
        if name not in ['origin','planning']:
            for k in [0,2]:
                when=at+k*beat
                if when<end-.1:place(RHYTHM,drum('kick'),when,.14*energy)
            for k in [1,3]:
                when=at+k*beat
                if when<end-.1:place(RHYTHM,drum('snare'),when,.085*energy)
        if bar_i%2==0:
            for i,n in enumerate(MOTIF):
                when=at+i*beat*.75
                if when>=min(end,at+bar*2):break
                place(LEAD,tone(n,.95,'keys'),when,.070*(.7+energy*.3),-.15+i%3*.15)

# Spatial early reflections on the tonal instruments; no cancellation in a mono downmix.
for delay,level in [(.173,.16),(.317,.11),(.491,.075)]:
    k=round(delay*SR);LEAD[k:]+=LEAD[:-k,::-1]*level
MUSIC=HARM+LEAD+RHYTHM
del HARM,LEAD,RHYTHM

def whoosh(at,duration=.42,gain=.04):
    t=clock(duration);noise=RNG.normal(0,1,len(t)).astype(np.float32)
    filtered=np.convolve(noise,np.ones(7)/7,mode='same')
    env=np.sin(np.pi*t/duration)**2
    place(FX,(filtered*env).astype(np.float32),at,gain)
def impact(at,gain=.13):
    place(FX,drum('kick'),at,gain)
    place(FX,tone(74,1.2,'keys'),at+.005,gain*.4)
for e in EVENTS:
    if e['kind']=='turn':
        tt=clock(.036);noise=RNG.normal(0,1,len(tt)).astype(np.float32)
        click=(.48*np.sin(2*np.pi*690*tt)+.20*(noise-np.roll(noise,1)))*np.exp(-tt*150)*np.minimum(1,tt/.001)
        place(FX,click.astype(np.float32),e['time'],.031 if e.get('method') in ['hook','ending'] else .023,0)
    elif e['kind']=='goal':place(FX,tone(81,.24,'marimba'),e['time'],.022)
    elif e['kind']=='cut':
        if e['scene'] in ['pieces','count','metric','bound','lbl','average','ending']:whoosh(e['time']-.25,.5,.055)
    elif e['kind']=='impact':impact(e['time'],.15)
    elif e['kind']=='reveal':
        at=e['time'];lo=max(0,round((at-.1)*SR));hi=min(N,round((at+.40)*SR))
        MUSIC[lo:hi]*=.15
        whoosh(at-.16,.28,.075);impact(at+.40,.09)

ending=SC['ending'];start=ending['start'];landing=next(e['time'] for e in EVENTS if e['kind']=='landing')
# A real cadence, with the last chord landing after the spoken question.
cadence=[(start,[50,53,57,64]),(start+3.0,[46,53,57,62]),(start+5.5,[45,52,55,61]),(landing,[50,54,57,64,69])]
for at,chord in cadence:
    duration=min(4.8,T['duration']-at+.02)
    for i,n in enumerate(chord):place(MUSIC,tone(n,duration,'pad'),at,.12,(i-(len(chord)-1)/2)*.24)
for i,n in enumerate([74,69,73,74]):
    place(MUSIC,tone(n,2.5,'keys'),landing-1.75+i*.58,.12,-.1+i*.08)
impact(landing,.09)

# Set the level AFTER arranging and ducking. The old mix set it before a 10 dB duck.
MUSIC*=DUCK[:,None]
level_knots,level_values,music_levels=[0],[],[]
for s in T['scenes']:
    a,b=round(s['start']*SR),round((s['start']+s['audio']['duration'])*SR)
    vr=float(np.sqrt(np.mean(VOICE[a:b]**2)));mr=float(np.sqrt(np.mean(MUSIC[a:b]**2)))
    target=-10.5 if s['id'] in ['history','constraints','inspection'] else -8 if s['id'] in ['lbl','cfop','roux'] else -9
    gain=vr*10**(target/20)/max(mr,1e-9)
    if not level_values:level_values.append(gain)
    level_knots.extend([s['start']+.12,s['end']-.12]);level_values.extend([gain,gain])
    music_levels.append(dict(scene=s['id'],targetVsVoiceDb=target,gain=round(gain,5)))
level_knots.append(T['duration']);level_values.append(level_values[-1])
music_level=np.interp(np.arange(N)/SR,level_knots,level_values).astype(np.float32)
MUSIC*=music_level[:,None]
fade=round(.85*SR);MUSIC[:round(.07*SR)]*=np.linspace(0,1,round(.07*SR))[:,None]
MUSIC[-fade:]*=np.linspace(1,0,fade)[:,None]
FX[-round(.18*SR):]*=np.linspace(1,0,round(.18*SR))[:,None]
mix=MUSIC+FX+VOICE[:,None]
write(OUT/'voice-stem.wav',VOICE);write(OUT/'music-stem.wav',MUSIC);write(OUT/'fx-stem.wav',FX);write(OUT/'mix-input.wav',mix)
raw=run(['ffmpeg','-hide_banner','-nostats','-i',str(OUT/'mix-input.wav'),'-af','loudnorm=I=-14:TP=-2:LRA=10:print_format=json','-f','null','-']).stderr.decode()
meter=json.loads(re.findall(r'\{[^{}]+\}',raw)[-1])
settings='loudnorm=I=-14:TP=-2:LRA=10:linear=true:'+':'.join(f'{dst}={meter[src]}' for dst,src in [('measured_I','input_i'),('measured_TP','input_tp'),('measured_LRA','input_lra'),('measured_thresh','input_thresh'),('offset','target_offset')])
run(['ffmpeg','-v','error','-y','-i',str(OUT/'mix-input.wav'),'-af',settings,'-ar',str(SR),'-c:a','pcm_s24le',str(OUT/'master-pretrim.wav')])
raw=run(['ffmpeg','-hide_banner','-nostats','-i',str(OUT/'master-pretrim.wav'),'-af','loudnorm=I=-14:TP=-2:LRA=10:print_format=json','-f','null','-']).stderr.decode()
pretrim=json.loads(re.findall(r'\{[^{}]+\}',raw)[-1]);adjust=-14-float(pretrim['input_i'])
run(['ffmpeg','-v','error','-y','-i',str(OUT/'master-pretrim.wav'),'-af',f'volume={adjust:.4f}dB,alimiter=limit=0.794328:level=0:attack=5:release=50:latency=1','-ar',str(SR),'-c:a','pcm_s24le',str(OUT/'master.wav')])
report=dict(sampleRate=SR,samples=N,duration=N/SR,voiceGainDb=round(20*math.log10(voice_gain),3),voiceFiles=len(active),music='Original FM keys, plucked ostinato, marimba, harmonic bass, drums, D-minor motif to D-major cadence',seed=2026102202,sections=[dict(name=a,start=b,end=c,bpm=d,energy=e) for a,b,c,d,e in sections],duckDb=round(20*math.log10(.67),2),musicSceneLevels=music_levels,events=len(EVENTS),landingSeconds=landing,targetLufs=-14,loudnormFirstPass=meter,pretrim=pretrim,finalGainDb=adjust,masterSha256=hashlib.sha256((OUT/'master.wav').read_bytes()).hexdigest(),timeStretch=False,subjectiveListeningPerformed=False)
(OUT/'audio-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False),flush=True)
