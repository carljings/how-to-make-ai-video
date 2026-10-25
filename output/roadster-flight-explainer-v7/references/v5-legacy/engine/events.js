// events.js — the film's meaning-driven instants, derived only from the aligned voice. Shared by the picture
// (timeline.js) and the score (tools/score.mjs) so cuts, hits and visual events land on the same words.
export function filmEvents(v) {
  const E = {};
  // ---- A 钩子 + B 原理 (the prototype cut, unchanged)
  E.v1 = v.start('V01');
  E.fallAt = v.at('V01', '掉', 'start') + 0.12;               // 「连灰都往下掉」 falls as 掉 is said
  E.pinAt = v.at('V01', '它');
  E.buDiao = v.at('V01', '不掉');
  E.cut12 = v.start('V02') - 0.3;
  E.xi = v.at('V02', '吸');
  E.crack = v.end('V02') - 0.05;
  E.cut23 = v.start('V03') - 0.12;
  E.ping = v.at('V03', '空气') - 0.04;
  E.press = v.at('V03', '压') - 0.04;
  E.cut34 = v.start('V04') - 0.25;
  E.fans = v.at('V04', '风扇');
  E.suck = v.at('V04', '抽走');
  E.cut45 = v.start('V05') - 0.2;
  E.outer = v.at('V05', '外面');
  E.inner = v.at('V05', '缝里');
  E.converge = v.end('V05') - 0.15;
  E.beam = E.converge + 0.55;
  E.gravity = E.converge + 1.05;
  E.protoEnd = v.end('V05') + 1.9;                            // the V01–V05 prototype ended here
  E.evacStart = E.suck - 0.05;
  E.evacDur = 1.45;
  // ---- S05→S06 按住 · 抓地
  E.an = v.at('V06', '按');                                    // the one push splits into the four tyres
  E.tyre = v.at('V06', '轮胎');
  E.cut56 = E.tyre - 0.25;                                     // macro: the tyre on the ceiling
  E.zhua = v.at('V06', '抓');                                  // grip
  // ---- S07 整条坡
  E.cut67 = v.start('V07') - 0.45;
  E.wall = v.at('V07', '墙上');
  E.ceil = v.at('V07', '顶上');
  E.force = v.at('V07', '这股力');
  E.always = v.at('V07', '始终');
  E.toward = v.at('V07', '压向坡面');
  // ---- S08 尽头
  E.cut78 = v.start('V08') - 0.5;
  E.endOf = v.at('V08', '尽头');
  // ---- S09 敞开 → 压不住 → the drop
  E.cut89 = v.start('V09') - 0.3;
  E.open = v.at('V09', '敞开');
  E.lose = v.at('V09', '压不住');
  E.drop = v.end('V09') + 0.15;
  // ---- S10 自带的高压气 (x-ray)
  E.cut910 = v.start('V10') - 0.4;
  E.swap = v.at('V10', '换');
  E.own = v.at('V10', '自带');
  E.hp = v.at('V10', '高压气');
  // ---- S11 喷 / 推, then the plunge into its cloud
  E.cut1011 = v.start('V11') - 0.2;
  E.spray = v.at('V11', '喷');
  E.push = v.at('V11', '推');
  E.plunge = v.end('V11') + 0.05;
  // ---- S12 separator, S13 the other demonstration
  E.black = v.start('V12') - 0.65;
  E.lot = v.start('V12') - 0.05;
  E.kfJet = v.at('V13', '喷气');
  E.kfOff = v.at('V13', '偏离');                               // time freezes: off-centre thrust → twist
  E.kfCom = v.at('V13', '重心');
  E.kfResume = v.end('V13') + 0.12;
  E.flip = v.at('V14', '翻');
  E.over = v.at('V14', '过来');
  // ---- S14 借 / 花 / 喷完
  E.cut1314 = v.start('V15') - 0.35;
  E.borrow = v.at('V15', '借');
  E.spend = v.at('V16', '花');
  E.own2 = v.at('V17', '自己');
  E.empty = v.at('V17', '喷完');
  E.lastWord = v.at('V17', '时候');
  E.title = v.end('V17') + 0.45;
  E.end = v.end('V17') + 3.0;
  return E;
}
