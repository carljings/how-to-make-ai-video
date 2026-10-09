import { DUR,ACTS,PULSES,WARM } from './timeline.js';
import { rng } from './lib.js';
const SR=48000,midi=n=>440*2**((n-69)/12);
const chords=[[50,57,62,65,69],[46,53,58,62,65],[48,55,60,64,67],[50,57,62,65,69],[43,50,57,62,65],[46,53,58,62,65],[48,55,60,64,67],[50,57,62,66,69],[50,57,62,65,69],[50,57,62,65,69]];

export async function renderScore(){
  const ctx=new OfflineAudioContext(2,DUR*SR,SR),R=rng(2005),bus=ctx.createGain();bus.gain.value=0;bus.gain.setValueAtTime(.35,0);bus.connect(ctx.destination);
  const response=await fetch('voice/narration.wav');if(!response.ok)throw new Error('Generate Chinese narration before rendering audio');
  const speech=ctx.createBufferSource(),spoken=ctx.createGain();spoken.gain.value=0;
  speech.buffer=await ctx.decodeAudioData(await response.arrayBuffer());speech.connect(spoken);spoken.connect(ctx.destination);
  spoken.gain.setValueAtTime(1,0);speech.start(0);
  const reverb=ctx.createConvolver(),ir=ctx.createBuffer(2,SR*2,SR);
  for(let k=0;k<2;k++){const a=ir.getChannelData(k);for(let i=0;i<a.length;i++)a[i]=(R()*2-1)*Math.exp(-i/SR*3.8)*.22;}
  reverb.buffer=ir;const revOut=ctx.createGain();revOut.gain.value=.33;reverb.connect(revOut);revOut.connect(bus);
  function voice(pan=0,send=.32){const g=ctx.createGain(),p=ctx.createStereoPanner(),s=ctx.createGain();g.gain.value=0;p.pan.value=pan;s.gain.value=send;g.connect(p);p.connect(bus);p.connect(s);s.connect(reverb);return g;}
  function pad(a,b,notes){
    notes.forEach((n,i)=>{const g=voice((i%2?.3:-.3),.4),lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=850+i*90;lp.Q.value=.45;lp.connect(g);
      for(const d of [-5,5]){const o=ctx.createOscillator();o.type='triangle';o.frequency.value=midi(n);o.detune.value=d;o.connect(lp);o.start(a);o.stop(Math.min(DUR,b+1.2));}
      g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(.022,a+Math.min(1.3,(b-a)/3));g.gain.setValueAtTime(.022,Math.max(a+1.5,b-.4));g.gain.linearRampToValueAtTime(0,Math.min(DUR,b+1.15));
    });
  }
  function bell(t,n,amp=.085,pan=0){
    const g=voice(pan,.52),o=ctx.createOscillator(),m=ctx.createOscillator(),depth=ctx.createGain(),f=midi(n),end=Math.min(DUR,t+2.2);
    o.type='sine';o.frequency.value=f;m.frequency.value=f*2.01;depth.gain.setValueAtTime(f*.9,t);depth.gain.exponentialRampToValueAtTime(1,t+1.1);m.connect(depth);depth.connect(o.frequency);o.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(amp,t+.008);g.gain.exponentialRampToValueAtTime(.0001,end-.03);g.gain.setValueAtTime(0,end);o.start(t);m.start(t);o.stop(end);m.stop(end);
  }
  function air(a,b){
    const length=Math.ceil((b-a)*SR),buffer=ctx.createBuffer(1,length,SR),d=buffer.getChannelData(0);for(let i=0;i<length;i++)d[i]=R()*2-1;
    const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=voice(0,.2);src.buffer=buffer;f.type='bandpass';f.Q.value=.7;f.frequency.setValueAtTime(480,a);f.frequency.exponentialRampToValueAtTime(2400,b-.08);src.connect(f);f.connect(g);
    g.gain.setValueAtTime(0,a);g.gain.linearRampToValueAtTime(.026,(a+b)/2);g.gain.linearRampToValueAtTime(0,b);src.start(a);src.stop(b);
  }
  ACTS.forEach((s,i)=>pad(Math.max(.02,s.a-.55),Math.min(DUR-1.5,s.b),chords[i]));
  PULSES.forEach((t,i)=>bell(t,[74,77,81,79][i%4],t<5?.075:.048,(i%2?.24:-.24)));
  WARM.forEach(t=>bell(t,69,.038,-.22));
  const melody=[74,77,81,79,77,74,72,69];
  for(let t=13.3,i=0;t<65;t+=2.9,i++)bell(t,melody[i%melody.length],.033,Math.sin(i)*.28);
  for(const s of ACTS.slice(1,-1)){air(s.a-.75,s.a+.12);bell(s.a+.2,s.id==='vision'?81:62,.047,0);}
  bell(66.2,74,.065);bell(68.1,77,.045);bell(70.0,81,.05);bell(72.4,86,.045);
  bus.gain.setValueAtTime(.35,72.5);bus.gain.linearRampToValueAtTime(0,DUR-.08);
  return ctx.startRendering();
}
export function toWav(buffer){
  const channels=buffer.numberOfChannels,length=buffer.length,data=new ArrayBuffer(44+length*channels*2),v=new DataView(data);
  const str=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,data.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,length*channels*2,true);
  const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));let off=44;
  for(let i=0;i<length;i++)for(let c=0;c<channels;c++){const a=Math.max(-1,Math.min(1,samples[c][i]));v.setInt16(off,Math.round(a*(a<0?32768:32767)),true);off+=2;}
  return new Uint8Array(data);
}
