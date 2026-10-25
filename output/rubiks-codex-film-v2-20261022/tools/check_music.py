from pathlib import Path
import json,subprocess,hashlib,numpy as np

ROOT=Path(__file__).resolve().parents[1]
OLD=ROOT.parent/'rubiks-codex-film-20261022'
T=json.loads((ROOT/'src/timeline.json').read_text())
OT=json.loads((OLD/'src/timeline.json').read_text())
VIDEO=ROOT/'out/rubiks-codex-v2.mp4'

def read(path,at,duration):
    channels=1 if path.name=='voice-stem.wav' else 2
    r=subprocess.run(['ffmpeg','-v','error','-ss',str(at),'-i',str(path),'-t',str(duration),'-ac',str(channels),'-ar','48000','-f','f32le','-'],capture_output=True,check=True)
    data=np.frombuffer(r.stdout,dtype='<f4').astype(np.float64)
    # Match the actual mix: voice is duplicated at unity gain; stereo is averaged.
    # FFmpeg's default stereo-to-mono conversion adds 3 dB to correlated material.
    return data if channels==1 else data.reshape(-1,2).mean(axis=1)
def db(x):return 20*np.log10(max(1e-12,np.sqrt(np.mean(x*x))))
def phone(x):
    z=np.fft.rfft(x);f=np.fft.rfftfreq(len(x),1/48000);z[(f<200)|(f>4000)]=0
    return np.fft.irfft(z,len(x))
def scene(t,id):return next(s for s in t['scenes'] if s['id']==id)

comparison=[]
for id in ['hook','pieces','metric','cfop','average','guangzhou','ending']:
    result={'scene':id}
    for label,root,t in [('v1',OLD,OT),('v2',ROOT,T)]:
        s=scene(t,id);at=s['start']+s['audio']['duration']*.30
        v=read(root/'audio/voice-stem.wav',at,2.5);m=read(root/'audio/music-stem.wav',at,2.5)
        result[label]={'start':round(at,3),'musicVsVoiceDb':round(float(db(m)-db(v)),2),'phoneBandMusicVsVoiceDb':round(float(db(phone(m))-db(phone(v))),2)}
    result['phoneBandIncreaseDb']=round(result['v2']['phoneBandMusicVsVoiceDb']-result['v1']['phoneBandMusicVsVoiceDb'],2)
    comparison.append(result)

# Recover the music contribution from the encoded mix, rather than only checking an exported stem.
fits=[]
for id in ['hook','pieces','metric','cfop','average','guangzhou','ending']:
    s=scene(T,id);at=s['start']+s['audio']['duration']*.30
    signals=[read(ROOT/'audio'/name,at,2) for name in ['voice-stem.wav','music-stem.wav','fx-stem.wav']]
    encoded=read(VIDEO,at,2)
    for i in range(8):
        a,b=i*12000,(i+1)*12000
        X=np.stack([x[a:b] for x in signals],axis=1);y=encoded[a:b]
        if np.sqrt(np.mean(X[:,0]**2))<.01:continue
        coefs=np.linalg.lstsq(X,y,rcond=None)[0]
        fit=X@coefs;r2=1-np.mean((fit-y)**2)/max(np.mean(y*y),1e-15)
        ratio=coefs[1]/coefs[0] if coefs[0]>0 else 0
        fits.append({'scene':id,'at':round(at+i*.25,3),'explainedEnergy':round(float(r2),5),'encodedMusicToVoiceGainRatio':round(float(ratio),4)})
good=[r for r in fits if r['explainedEnergy']>.97 and .75<r['encodedMusicToVoiceGainRatio']<1.25]
scene_fits=[]
for id in ['hook','pieces','metric','cfop','average','guangzhou','ending']:
    values=[r for r in fits if r['scene']==id]
    ratio=float(np.median([r['encodedMusicToVoiceGainRatio'] for r in values]))
    assert .80<ratio<1.2 and any(g['scene']==id for g in good),(id,ratio)
    scene_fits.append(dict(scene=id,medianMusicToVoiceGainRatio=round(ratio,4),bestExplainedEnergy=max(r['explainedEnergy'] for r in values)))
report={'videoSha256':hashlib.sha256(VIDEO.read_bytes()).hexdigest(),'comparison':comparison,'encodedMusicRecoveredAcrossAllActs':True,'fitWindows':len(fits),'passingFitWindows':len(good),'sceneFits':scene_fits,'fits':fits,'subjectiveListeningPerformed':False,'physicalPhoneListening':False,'phoneBandDefinitionHz':[200,4000],'downmix':'native mono voice, arithmetic mean of stereo tracks; no implicit -3 dB channel mapping'}
(ROOT/'out/music-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='fits'}))
