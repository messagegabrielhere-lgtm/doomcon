// Pixel icons for the rooms that had no illustration of their own, so no two
// tiles on the homepage share a picture. 16x16 grids; build.mjs writes each
// as public/img/px-<name>.svg and the tiles use them like the webp art.
export const TILE_ICONS = {
  radio: [{ a: '#818CF8', b: '#1E1B4B', c: '#E0E7FF', d: '#F87171' }, [
    '..........c.....', '.........c......', '........c.......', '.aaaaaaaaaaaaaa.', 'a..............a', 'a.bbbbbb..ccc..a', 'a.bccccb.c...c.a', 'a.bbbbbb.c.d.c.a',
    'a.bccccb.c...c.a', 'a.bbbbbb..ccc..a', 'a..............a', 'a.aa.aa.aa.aa..a', 'a..............a', '.aaaaaaaaaaaaaa.', '..a..........a..', '................']],
  chat: [{ a: '#4ADE80', b: '#052E16', c: '#FFFFFF' }, [
    '................', '.aaaaaaaaaaaaaa.', 'abbbbbbbbbbbbbba', 'abbbbbbbbbbbbbba', 'abccbccccbcccbba', 'abbbbbbbbbbbbbba', 'abcccbccbcccbbba', 'abbbbbbbbbbbbbba',
    'abbbbbbbbbbbbbba', '.aaaabbaaaaaaaa.', '....abba........', '....aba.........', '....aa..........', '....a...........', '................', '................']],
  updown: [{ a: '#F87171', b: '#4ADE80', c: '#FFFFFF' }, [
    '................', '...a............', '..aaa.......b...', '.aaaaa......b...', 'aaaaaaa.....b...', '...a........b...', '...a........b...', '...a........b...',
    '...a........b...', '...a........b...', '...a.....bbbbbbb', '...a......bbbbb.', '...a.......bbb..', '...a........b...', '................', 'cccccccccccccccc']],
  candles: [{ a: '#4ADE80', b: '#F87171', c: '#9CA3AF' }, [
    '................', '..c.............', '..c.......c.....', '.aaa......c.....', '.aaa.....bbb....', '.aaa.....bbb.c..', '.aaa..c..bbb.c..', '..c..bbb.bbb.aaa',
    '..c..bbb.bbb.aaa', '.....bbb..c..aaa', '.....bbb..c..aaa', '......c.......c.', '......c.......c.', '................', 'cccccccccccccccc', '................']],
  doc: [{ a: '#E5E7EB', b: '#9CA3AF', c: '#4ADE80' }, [
    '..aaaaaaaaa.....', '..a.......aa....', '..a.cccc..a.a...', '..a.......aaaa..', '..a.bbbbbbbb.a..', '..a..........a..', '..a.bbbbbbbb.a..', '..a..........a..',
    '..a.bbbbbbbb.a..', '..a..........a..', '..a.bbbbb....a..', '..a..........a..', '..a..........a..', '..aaaaaaaaaaaa..', '................', '................']],
  antenna: [{ a: '#E5E7EB', b: '#38BDF8', c: '#F87171' }, [
    '.b...........b..', 'b..b.......b..b.', 'b.b...ccc...b.b.', 'b.b..ccccc..b.b.', 'b..b..ccc..b..b.', '.b.....a.....b..', '.......a........', '......aaa.......',
    '......a.a.......', '.....a...a......', '.....aaaaa......', '....a.....a.....', '....a.....a.....', '...a.......a....', '..aaaaaaaaaaa...', '................']],
  tv: [{ a: '#A5B4FC', b: '#0B1020', c: '#F87171', d: '#FFFFFF' }, [
    '.....a...a......', '......a.a.......', '.......a........', 'aaaaaaaaaaaaaaaa', 'abbbbbbbbbbbbbba', 'abbbbcbbbbbbbbba', 'abbbbccbbbbbbbba', 'abbbbcccbbbbbbba',
    'abbbbccccbbbbbba', 'abbbbcccbbbbbbba', 'abbbbccbbbbbbbba', 'abbbbcbbbbbbbbba', 'aaaaaaaaaaaaaaaa', '..aa........aa..', '................', '................']],
  team: [{ a: '#9CA3AF', b: '#0B0F17', c: '#4ADE80', d: '#60A5FA' }, [
    '................', '..cc......dd....', '.cccc....dddd...', '.cbcbc..ddbdbd..', '.cccc....dddd...', '..cc......dd....', '.aaaa....aaaa...', 'aaaaaa..aaaaaa..',
    'aaaaaa..aaaaaa..', 'a.aa.a..a.aa.a..', '..aa......aa....', '..a.a....a..a...', '................', '.....aaaa.......', '................', '................']],
  cabin: [{ a: '#B45309', b: '#78350F', c: '#4ADE80', d: '#FDE68A' }, [
    '...........c....', '..........ccc...', '......a..ccccc..', '.....aaa.ccccc..', '....aaaaa.ccc...', '...aaaaaaa.b....', '..aaaaaaaaa b...', '.bbbbbbbbbbbb...',
    '..bddbbbbddb....', '..bddbbbbddb....', '..bbbbaabbbb..c.', '..bbbbaabbbb.ccc', '..bbbbaabbbbcccc', 'cccccccccccccccc', '................', '................']],
  rocket: [{ a: '#E5E7EB', b: '#60A5FA', c: '#F87171', d: '#FACC15' }, [
    '.......aa.......', '......aaaa......', '......abba......', '.....aabbaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '.....aaaaaa.....', '....caaaaaac....',
    '...cc.aaaa.cc...', '..ccc.aaaa.ccc..', '.......dd.......', '......dddd......', '.......dd.......', '.......d........', '................', '................']],
  badge: [{ a: '#E5E7EB', b: '#4ADE80', c: '#0B0F17', d: '#9CA3AF' }, [
    '......dddd......', '......d..d......', '.aaaaaaaaaaaaaa.', '.a............a.', '.a.bbb........a.', '.a.bbb.dddddd.a.', '.a.bbb........a.', '.a.....dddd...a.',
    '.a.ccc.......a..', '.a............a.', '.a.dddddddddd.a.', '.a............a.', '.aaaaaaaaaaaaaa.', '................', '................', '................']],
  backpack: [{ a: '#4ADE80', b: '#166534', c: '#BBF7D0', d: '#000000' }, [
    '.....bbbbbb.....', '....b......b....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '..aacccccccaaa..', '..aacaaaaacaaa..', '..aacccccccaaa..', '..aaaaaaaaaaaa..',
    '..abbbbbbbbbba..', '..ab..dd....ba..', '..ab........ba..', '..abbbbbbbbbba..', '..aaaaaaaaaaaa..', '...aa......aa...', '................', '................']],
  bulb: [{ a: '#FACC15', b: '#FEF08A', c: '#9CA3AF', d: '#FFFFFF' }, [
    'd......d.......d', '.d.....d......d.', '..d.aaaaaa...d..', '...aabbbbaa.....', '..aabbddbbaa....', '..abbbddbbba....', '..abbbbbbbba....', '..aabbbbbbaa....',
    '...aabbbbaa.....', '....aabbaa......', '.....cccc.......', '.....cccc.......', '.....cccc.......', '......cc........', '................', '................']],
  ruler: [{ a: '#FACC15', b: '#0B0F17', c: '#60A5FA' }, [
    '................', '................', '..............cc', '............cccc', 'aaaaaaaaaaaaaaaa', 'abababababababab', 'ab.b.b.ab.b.b.ab', 'a...............',
    'aaaaaaaaaaaaaaaa', '................', '..cc..........cc', '..cccccccccccccc', '..cc..........cc', '................', '................', '................']],
  code: [{ a: '#4ADE80', b: '#A5B4FC', c: '#FFFFFF' }, [
    '................', '................', '....a......a....', '...a.......ba...', '..a....b....a...', '.a....b......a..', 'a....b........a.', '.a..b........a..',
    '..a.b.......a...', '...ab......a....', '....a...........', '.......cc.......', '......cccc......', '.....cccccc.....', '.......cc.......', '.......cc.......']],
  bell: [{ a: '#FACC15', b: '#CA8A04', c: '#F87171' }, [
    '.......cc.......', '......aaaa......', '.....aaaaaa.....', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....', '....aaaaaaaa....', '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..', '.bbbbbbbbbbbbbb.', '.......aa.......', '.......aa.......', 'c..c........c..c', '.c.c........c.c.', '................', '................']],
  notebook: [{ a: '#F59E0B', b: '#78350F', c: '#FFFFFF', d: '#9CA3AF' }, [
    '..aaaaaaaaaaaa..', '.baaaaaaaaaaaa..', '..acccccccccca..', '.bacddddddddca..', '..acccccccccca..', '.bacddddddddca..', '..acccccccccca..', '.bacdddddd.cca..',
    '..acccccccccca..', '.bacccccccccca..', '..acccccccccca..', '.baaaaaaaaaaaa..', '................', '................', '................', '................']],
  crosshair: [{ a: '#4ADE80', b: '#F87171' }, [
    '.......a........', '.......a........', '....aaaaaaa.....', '...a...a...a....', '..a....a....a...', '..a.........a...', 'aaaaa..b..aaaaa.', '..a...bbb...a...',
    '..a....b....a...', '..a.........a...', '...a...a...a....', '....aaaaaaa.....', '.......a........', '.......a........', '................', '................']],
  agent: [{ a: '#38BDF8', b: '#0B0F17', c: '#FFFFFF', d: '#4ADE80' }, [
    '.......d........', '.......d........', '...aaaaaaaaa....', '..aaaaaaaaaaa...', '..aabbaaabbaa...', '..aacbaaacbaa...', '..aaaaaaaaaaa...', '..aaabbbbbaaa...',
    '...aaaaaaaaa....', '.....aaaaa......', '...aaaaaaaaa....', '..a.aaaaaaa.a...', '..a.aaaaaaa.a...', '....aa...aa.....', '................', '................']],
  agent2: [{ a: '#38BDF8', b: '#0B0F17', c: '#FFFFFF', d: '#F472B6' }, [
    '................', '..d.......d.....', '..aaaa..aaaa....', '.abbaa.abbaa....', '.acba..acba.....', '.aaaa..aaaa.....', '..aa....aa......', '.aaaa..aaaa.....',
    '................', '...cccccccc.....', '..c........c....', '..c.d..d.d.c....', '..c........c....', '...cccc.ccc.....', '.......c........', '......c.........']],
  crosshair2: [{ a: '#F87171', b: '#FECACA', c: '#7F1D1D' }, [
    '......aaaa......', '....aa....aa....', '...a...bb...a...', '..a....bb....a..', '.a............a.', '.a....cccc....a.', 'a....c....c....a', 'abbb.c.aa.c.bbba',
    'abbb.c.aa.c.bbba', 'a....c....c....a', '.a....cccc....a.', '.a............a.', '..a....bb....a..', '...a...bb...a...', '....aa....aa....', '......aaaa......']],
  core: [{ a: '#4ADE80', b: '#F87171', c: '#FFFFFF', d: '#A78BFA' }, [
    '.....aaaaaa.....', '...aa......aa...', '..a...b.......a.', '.a..........d..a', '.a.....bb......a', 'a.....bbbb.....a', 'a....bbccbb....a', 'a....bbccbb....a',
    'a.....bbbb.....a', 'a......bb......a', '.a.b...........a', '.a..........b.a.', '..a...........a.', '...aa......aa...', '.....aaaaaa.....', '................']],
  scalebias: [{ a: '#E5E7EB', b: '#F87171', c: '#60A5FA' }, [
    '.......a........', '..aaaaaaaaaaaa..', '..a....a.....a..', '.a.a...a.....a..', 'a...a..a....a.a.', 'bbbbb..a...a...a', '.......a..ccccccc', '.......a.........',
    '.......a........', '.......a........', '.......a........', '.....aaaaa......', '....aaaaaaa.....', '................', '................', '................']],
  // The Day After: a protest megaphone.
  megaphone: [{ a: '#F87171', b: '#FDE68A', c: '#E5E7EB', d: '#7F1D1D' }, [
    '................', '...........aa...', '.........aaba...', '.......aabbba...', '.cc..aabbbbba...', '.ccaabbbbbbba..b', '.ccabbbbbbbba.b.', '.ccabbbbbbbba...',
    '.ccabbbbbbbba.bb', '.ccaabbbbbbba...', '.cc..ddabbbba.b.', '.....dd.aabba..b', '.....dd...aba...', '....ddd....aa...', '................', '................']],
  // Round 3 (2026-10-09): What's New, Dispatch.
  waffle: [{ a: '#B45309', b: '#F59E0B', c: '#FDE68A' }, [
    '................', '..aaaaaaaaaaaa..', '.abbabbabbabbaa.', '.abbabbabbabba..', '.aaaaaaaaaaaaaa.', '.abbabbabbabbaa.', '.abbabbabbabba..', '.aaaaaaaaaaaaaa.',
    '.abbabbacccbbaa.', '.abbabbcccccba..', '.aaaaaaacccaaaa.', '.abbabbabcbabba.', '.abbabbabbabba..', '..aaaaaaaaaaaa..', '................', '................']],
  pclock: [{ a: '#E5E7EB', b: '#0F172A', c: '#F87171', d: '#FACC15' }, [
    '................', '.....aaaaaa.....', '...aabbcbbbaa...', '..abbbbcbbbbba..', '.abbbbbcbbbbbba.', '.abbbbbcbbbbbba.', 'abbbbbbcbbbbbbba', 'abbbbbbcbbbbbbba',
    'abbbbbbdbbbbbbba', 'abbbbbdbbbbbbbba', '.abbbdbbbbbbbba.', '.abbdbbbbbbbbba.', '..abbbbbbbbbba..', '...aabbbbbbaa...', '.....aaaaaa.....', '................']],
  statuspulse: [{ a: '#4ADE80', b: '#1F2937', c: '#F87171', d: '#E5E7EB' }, [
    '................', '.dddddddddddddd.', '.dbbbbbbbbbbbbd.', '.dbbbbbbbbbbbbd.', '.dbbbbbbcbbbbbd.', '.dbbbbbbcbbbbbd.', '.dbbbbbcbcbbbbd.', '.daaaabcbcbaaad.',
    '.dbbbbabbbcbbbd.', '.dbbbbabbbcbbbd.', '.dbbbbbbbbbbbbd.', '.dbbbbbbbbbbbbd.', '.dddddddddddddd.', '......dddd......', '....dddddddd....', '................']],
  redeye: [{ a: '#F87171', b: '#7F1D1D', c: '#FFFFFF', d: '#1F2937' }, [
    '................', '................', '................', '....dddddddd....', '..dddbbbbbbddd..', '.ddbbbaaaabbbdd.', 'ddbbaaaaaaaabbdd', 'dbbaaaaccaaaabbd',
    'dbbaaaaccaaaabbd', 'ddbbaaaaaaaabbdd', '.ddbbbaaaabbbdd.', '..dddbbbbbbddd..', '....dddddddd....', '................', '................', '................']],
  threatshield: [{ a: '#FB923C', b: '#7C2D12', c: '#FFFFFF', d: '#1F2937' }, [
    '................', '.......aa.......', '.....aaaaaa.....', '...aaabbbbaaa...', '..aabbbbbbbbaa..', '..abbbbccbbbba..', '..abbbbccbbbba..', '..abbbbccbbbba..',
    '..abbbbccbbbba..', '..abbbbbbbbbba..', '...abbbbccbbba..', '...aabbbccbbaa..', '....aabbbbbaa...', '.....aaabaaa....', '.......aa.......', '................']],
  pylon: [{ a: '#FACC15', b: '#94A3B8', c: '#FDE68A' }, [
    '.......bb.......', '......b..b......', '.bbbbbbbbbbbbbb.', '..b...b..b...b..', '......b..b......', '...bbbbbbbbbb...', '....b.b..b.b....', '......b..b......',
    '.....b....b.....', '.....b.aa.b.....', '....b..aa..b....', '....b.aa...b....', '...b..aaaa..b...', '...b....aa..b...', '..b.....a....b..', '..b..........b..']],
  trendchart: [{ a: '#60A5FA', b: '#334155', c: '#F87171', d: '#FACC15' }, [
    '................', '.b..............', '.b...........cc.', '.b..........c...', '.b.........c....', '.b....d...c.....', '.b...d.d.c......', '.b..d...c.......',
    '.b.d...c.d......', '.bd...c...d.....', '.b...c.....d..d.', '.b..c.......dd..', '.b.c............', '.bbbbbbbbbbbbbb.', '................', '................']],
  hurricane: [{ a: '#60A5FA', b: '#F87171', c: '#FFFFFF' }, [
    '................', '......aaaa......', '....aa....a.....', '...a...bb..a....', '..a...b..b......', '..a..b....b.a...', '.a...b.cc.b..a..', '.a..b.cccc.b.a..',
    '..a.b.cccc.b..a.', '..a.b..cc.b...a.', '...a.b....b..a..', '.....b..b...a...', '......bb...a....', '....a.....aa....', '.....aaaaa......', '................']],
  onair: [{ a: '#F87171', b: '#450A0A', c: '#FECACA', d: '#FCA5A5' }, [
    '................', '................', '.aaaaaaaaaaaaaa.', '.abbbbbbbbbbbba.', '.abccbcbbcbbcba.', '.abcbccbcbcccba.', '.abcbcbbcbcbcba.', '.abccbcbbcbbcba.',
    '.abbbbbbbbbbbba.', '.aaaaaaaaaaaaaa.', '.......d........', '......ddd.......', '................', '..d..........d..', '.d............d.', '................']],
  agentcode: [{ a: '#60A5FA', b: '#4ADE80', c: '#64748B', d: '#F87171' }, [
    '................', '.cccccccccccccc.', '.cddddddddddddc.', '.cccccccccccccc.', '.c............c.', '.c...a....b...c.', '.c..a....b....c.', '.c.a....b..a..c.',
    '.c..a..b...a..c.', '.c...ab.....a.c.', '.c....b....a..c.', '.c...b....a...c.', '.c............c.', '.cccccccccccccc.', '................', '................']],
  flame: [{ a: '#F87171', b: '#FB923C', c: '#FDE68A', d: '#7F1D1D' }, [
    '.......a........', '......aa........', '......aba.......', '.....abba....a..', '....abbbba..aa..', '....abbcbba.aba.', '...abbcccbbabba.', '...abccccccbbba.',
    '..abbccccccbbba.', '..abccccccccbba.', '..abccccccccbba.', '..abbccccccbbba.', '...abbccccbbba..', '....aabbbbbaa...', '..dddddddddddd..', '................']],
  seismo: [{ a: '#4ADE80', b: '#1F2937', c: '#F87171', d: '#E5E7EB' }, [
    '................', '.bbbbbbbbbbbbbb.', '.b............b.', '.b......c.....b.', '.b.....cc.....b.', '.b.....c.c....b.', '.b....c..c....b.', '.aaaaac...c.aaa.',
    '.b...c....c.c.b.', '.b........c.c.b.', '.b.........cc.b.', '.b..........c.b.', '.b............b.', '.bbbbbbbbbbbbbb.', '..d.d.d.d.d.d...', '................']],
  headline: [{ a: '#E5E7EB', b: '#94A3B8', c: '#FACC15', d: '#0F172A' }, [
    '................', '.aaaaaaaaaaaaa..', '.addddddddddda..', '.adccccccccccda.', '.addddddddddda.a', '.adbbbb.dbbbbda.', '.adb..b.dbbbbda.', '.adbbbb.ddddda.a',
    '.adb..b.dbbbbda.', '.adddddddddddda.', '.adbbbbbbbbbbda.', '.adbbbbbbbbbbda.', '.adddddddddddda.', '.aaaaaaaaaaaaaa.', '................', '................']],
  joystick: [{ a: '#F87171', b: '#7F1D1D', c: '#9CA3AF', d: '#1F2937' }, [
    '................', '......aaa.......', '.....aaaaa......', '.....aabaa......', '......aaa.......', '.......c........', '.......c........', '.......c........',
    '.......c........', '..dddddcddddd...', '.ddddddddddddd..', '.dd.a...dddddd..', '.ddaaa..dd.c.d..', '.dd.a...ddddddd.', '..ddddddddddd...', '................']],
  beacon: [{ a: '#F87171', b: '#FCA5A5', c: '#9CA3AF', d: '#FDE68A' }, [
    '................', '..d.........d...', '...d...a...d....', '....d.aaa.d.....', '.d...aabaa...d..', '..d.aabbbaa.d...', '....aabbbaa.....', '....aabbbaa.....',
    '....aaaaaaa.....', '...ccccccccc....', '...ccccccccc....', '..ccccccccccc...', '..ccccccccccc...', '................', '................', '................']],
  // Search, Catalog, and the catalog's own cards for videos, feeds and data.
  search: [{ a: '#A5B4FC', b: '#1E1B4B', c: '#E0E7FF', d: '#FACC15' }, [
    '................', '....aaaaaa......', '...abbbbbba.....', '..abccbbbbba....', '.abcbbbbbbbba...', '.abcbbbbbbbba...', '.abbbbbbbbbba...', '.abbbbbbbbbba...',
    '.abbbbbbbbbba...', '..abbbbbbbba....', '...abbbbbbadd...', '....aaaaaa.ddd..', '............ddd.', '.............ddd', '................', '................']],
  catalog: [{ a: '#94A3B8', b: '#0F172A', c: '#4ADE80', d: '#F472B6' }, [
    '................', '.aaaaaaaaaaaaaa.', '.abbbbbbbbbbbba.', '.abbbbccccbbbba.', '.abbbbbddbbbbba.', '.aaaaaaaaaaaaaa.', '.abbbbbbbbbbbba.', '.abbbbccccbbbba.',
    '.abbbbbddbbbbba.', '.aaaaaaaaaaaaaa.', '.abbbbbbbbbbbba.', '.abbbbccccbbbba.', '.abbbbbddbbbbba.', '.aaaaaaaaaaaaaa.', '..a..........a..', '................']],
  film: [{ a: '#E5E7EB', b: '#0B1020', c: '#F87171' }, [
    '................', 'aaaaaaaaaaaaaaaa', 'a.a.a.a.a.a.a.aa', 'aaaaaaaaaaaaaaaa', 'abbbbbbbbbbbbbba', 'abbbbbcbbbbbbbba', 'abbbbbccbbbbbbba', 'abbbbbcccbbbbbba',
    'abbbbbccccbbbbba', 'abbbbbcccbbbbbba', 'abbbbbccbbbbbbba', 'abbbbbcbbbbbbbba', 'aaaaaaaaaaaaaaaa', 'a.a.a.a.a.a.a.aa', 'aaaaaaaaaaaaaaaa', '................']],
  rss: [{ a: '#FB923C', b: '#FFFFFF' }, [
    '................', '.aaaaaaaaaaaaaa.', '.a............a.', '.a.bbbbb......a.', '.a......bb....a.', '.a.bbb....b...a.', '.a....bb...b..a.', '.a......b...b.a.',
    '.a.bb....b..b.a.', '.a.bbb...b..b.a.', '.a.bbb...b..b.a.', '.a............a.', '.aaaaaaaaaaaaaa.', '................', '................', '................']],
  db: [{ a: '#38BDF8', b: '#0C4A6E', c: '#E0F2FE' }, [
    '................', '....aaaaaaaa....', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..', '..abbbbbbbbbba..', '..abbbbbbbbcba..', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..',
    '..abbbbbbbbbba..', '..abbbbbbbbcba..', '..aabbbbbbbbaa..', '..aaaaaaaaaaaa..', '..abbbbbbbbbba..', '..abbbbbbbbcba..', '...aaaaaaaaaa...', '................']],
  // LIVE: AI on TV & radio — a set with its antenna up and signal going out.
  livetv: [{ a: '#F59E0B', b: '#0B1020', c: '#38BDF8', d: '#F87171', e: '#FFFFFF' }, [
    '.c.....dd.....c.', 'c.c...a..a...c.c', 'c.c..a....a..c.c', '.c..a......a..c.', '...a........a...', 'aaaaaaaaaaaaaaaa', 'abbbbbbbbbbbaeea', 'abddbbbbbbbbaeea',
    'abddbbbbbbbbaaaa', 'abbbbbbbbbbbaeea', 'abeebeebeebbaaaa', 'abbbebbebbebaeea', 'abbbbbbbbbbbaaaa', 'aaaaaaaaaaaaaaaa', '.aa..........aa.', '................']],
  // Nothing Ever Happens: a flatline shrug.
  shrug: [{ a: '#94A3B8', b: '#E2E8F0', c: '#64748B' }, [
    '................', '................', '..bb........bb..', '.b..b......b..b.', 'b....b....b....b', '......aaaa......', '................', '..cccccccccccc..',
    '..c..........c..', '..c..bb..bb..c..', '..c..........c..', '..c...cccc...c..', '..c..........c..', '..cccccccccccc..', '................', '................']],
  // The Arcade: a pixel arcade cabinet.
  arcade: [{ a: '#7C3AED', b: '#1E1B4B', e: '#0B1020', c: '#4ADE80', f: '#312E81', d: '#F87171', g: '#FACC15', h: '#60A5FA' }, [
    '....aaaaaaaa....', '...abbbbbbbba...', '...abeeeeeeba...', '...abecceceba...', '...abeeeeeeba...', '...abeceeceba...', '...abeeeeeeba...', '...abbbbbbbba...',
    '..aaaaaaaaaaaa..', '..afffffffffffa.', '..af.d..g.h.fa..', '..affffffffffa..', '...abbbbbbbba...', '...abbbbbbbba...', '...aaaaaaaaaa...', '................']],
  // The Evolution Log: a ruled logbook.
  logbook: [{ a: '#A16207', b: '#FEF3C7', c: '#713F12', d: '#4ADE80', e: '#94A3B8' }, [
    '................', '..aaaaaaaaaaa...', '..abbbbbbbbbac..', '..abddbbbbbbac..', '..abbbbbbbbbac..', '..abeeeeeebbac..', '..abbbbbbbbbac..', '..abeeeebbbbac..',
    '..abbbbbbbbbac..', '..abeeeeeebbac..', '..abbbbbbbbbac..', '..abeeebbbbbac..', '..abbbbbbbbbac..', '..aaaaaaaaaaac..', '...cccccccccc...', '................']],
  // SIREN Labs: a flask on the bench.
  flask: [{ a: '#CBD5E1', b: '#64748B', c: '#22D3EE', d: '#ECFEFF' }, [
    '......aaaa......', '......abba......', '.......bb.......', '.......bb.......', '.......bb.......', '......abba......', '.....ab..ba.....', '.....a....a.....',
    '....a......a....', '....a.cccc.a....', '...a.cccdcc.a...', '...acccccdcca...', '..accdcccccca...', '..acccccdccca...', '...aaaaaaaaaa...', '................']],
  // SIREN Labs (What’s New): a bubbling beaker.
  beaker: [{ a: '#CBD5E1', c: '#4ADE80', d: '#DCFCE7' }, [
    '................', '..aaaaaaaaaaa...', '..a.........a...', '...a.......a....', '...a.......a....', '...a..d....a....', '...a.......a....', '...a...d.d.a....',
    '...acccccccaa...', '...acccdcccca...', '...accccccdca...', '...acdccccccaa..', '...acccccdcca...', '...accccccccc...', '....aaaaaaaa....', '................']],
  // USA vs China: two flags face off.
  flagclash: [{ a: '#3B82F6', b: '#FFFFFF', c: '#EF4444', d: '#FACC15', e: '#94A3B8' }, [
    '................', '.eaaaaaa.eccccc.', '.eabbbba.ecdddc.', '.eaaaaaa.eccccc.', '.eabbbba.ecdddc.', '.eaaaaaa.eccccc.', '.e.......e......', '.e.......e......',
    '.e.......e......', '.e.......e......', '.e.......e......', '.e.......e......', '.e.......e......', '.e.......e......', 'eee.....eee.....', '................']],
  // USA vs China (What’s New): a tug of war.
  tugofwar: [{ a: '#60A5FA', c: '#F87171', f: '#D6A35C', d: '#FACC15' }, [
    '................', '................', '................', '.aa..........cc.', 'aaaa........cccc', 'aaaa........cccc', '.aa..........cc.', '.aaa.ffffff.ccc.',
    'aaaaffffffffcccc', '.aa....d.....cc.', '.aa....d.....cc.', '.a.a...d....c.c.', '.a..a..d...c..c.', 'a....a.d..c....c', '................', '................']],
  // Tip #255: unique homepage room icons (no shared tile art).
  tags: [{ a: '#38BDF8', b: '#0B1020', c: '#FACC15', d: '#E5E7EB' }, [
    '................', '..aaaaaaaaaaaa..', '.adddddddddddda.', '.adaaaaaaaaaada.', '.ada.c....c.ada.', '.adaaaaaaaaaada.', '.ada.c.c.c..ada.', '.adaaaaaaaaaada.',
    '.ada....c...ada.', '.adaaaaaaaaaada.', '.ada.c.c.c.c.ada', '.adaaaaaaaaaada.', '.adddddddddddda.', '..aaaaaaaaaaaa..', '................', '................']],
  outlets: [{ a: '#A78BFA', b: '#1E1B4B', c: '#E5E7EB', d: '#F472B6' }, [
    '................', '..aaaaaaaaaaaa..', '.abbbbbbbbbbbba.', '.abccccccccccba.', '.abcaaaaaaacba..', '.abca.dd.aacba..', '.abcaaaaaaacba..', '.abccccccccccba.',
    '.abbbbbbbbbbbba.', '.aaaaaaaaaaaaaa.', '.aa..........aa.', '.aa.aaaaaaaa.aa.', '.aa.a......a.aa.', '.aaaaaaaaaaaaaa.', '................', '................']],
  companies: [{ a: '#60A5FA', b: '#0B1020', c: '#FACC15' }, [
    '................', '....aaaaaaaa....', '...abbbbbbbba...', '...abccccccba...', '...abbbbbbbba...', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaaaaaaaaaaaaa.',
    '.aa.aa.aa.aa.aa.', '.aaaaaaaaaaaaaa.', '.aa..........aa.', '.aa.aaaaaaaa.aa.', '.aa.a......a.aa.', '.aaaaaaaaaaaaaa.', '................', '................']],
  leaderswire: [{ a: '#F472B6', b: '#0B1020', c: '#FFFFFF', d: '#FACC15' }, [
    '.......dd.......', '......dddd......', '.......dd.......', '......aaaa......', '.....aaaaaa.....', '.....abbbba.....', '.....acccca.....', '.....aaaaaa.....',
    '......aaaa......', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaaaaaaaaaaaaa.', 'aaaaaaaaaaaaaaaa', '................', '................']],
  pillars: [{ a: '#E5E7EB', b: '#64748B', c: '#4ADE80', d: '#F87171', e: '#60A5FA' }, [
    '................', '.c..d..e..c..d..', '.c..d..e..c..d..', '.c..d..e..c..d..', '.c..d..e..c..d..', '.c..d..e..c..d..', '.c..d..e..c..d..', '.c..d..e..c..d..',
    '.c..d..e..c..d..', '.c..d..e..c..d..', '.aaaaaaaaaaaaaa.', '.aaaaaaaaaaaaaa.', '................', '................', '................', '................']],
  moved: [{ a: '#4ADE80', b: '#F87171', c: '#FACC15', d: '#E5E7EB' }, [
    '................', '....a...........', '...aaa..........', '..aaaaa....bbb..', '....a......bbb..', '....a...c..bbb..', '....a..ccc.bbb..', '....a...c.......',
    '....a...........', '....a.....dddd..', '....a.....dddd..', '....a......dd...', '....a.......d...', '................', '................', '................']],
  versus: [{ a: '#F87171', b: '#60A5FA', c: '#E5E7EB' }, [
    '................', '.aa..........bb.', '.aaa........bbb.', '..aa........bb..', '...aa......bb...', '....aa....bb....', '.....aa..bb.....', '......aabb......',
    '......bbaa......', '.....bb..aa.....', '....bb....aa....', '...bb......aa...', '..bb........aa..', '.bbb........aaa.', '.bb..........aa.', '................']],
  vsrival: [{ a: '#FB923C', b: '#38BDF8', c: '#FACC15' }, [
    '................', 'aaaaaaaa..bbbbbb', 'a......a..b....b', 'a..cc..a..b..ccb', 'a......a..b....b', 'aaaaaaaa..bbbbbb', '................', '....cccccccc....',
    '....c......c....', '....c..aa..c....', '....c......c....', '....cccccccc....', '................', '................', '................', '................']],
  vstakeoff: [{ a: '#A78BFA', b: '#4ADE80', c: '#FACC15' }, [
    '.......cc.......', '......cccc......', '.......cc.......', '......bbbb......', '.....bbbbbb.....', '....bbbbbbbb....', '...bbbbbbbbbb...', '..bbbbbbbbbbbb..',
    '.aaaaaaaaaaaaaa.', '.a............a.', '.a.bbbbbbbbbb.a.', '.a............a.', '.aaaaaaaaaaaaaa.', '................', '................', '................']],
  alts: [{ a: '#94A3B8', b: '#0B1020', c: '#4ADE80', d: '#F87171' }, [
    '................', '..aaaaaaaaaaaa..', '.abbbbbbbbbbbba.', '.abaaaaaaaaaaba.', '.aba.c....d.aba.', '.abaaaaaaaaaaba.', '.aba......c.aba.', '.abaaaaaaaaaaba.',
    '.aba.d........ba', '.abaaaaaaaaaaba.', '.abbbbbbbbbbbba.', '..aaaaaaaaaaaa..', '................', '................', '................', '................']],
  countries: [{ a: '#34D399', b: '#0B1020', c: '#60A5FA', d: '#FACC15' }, [
    '................', '....aaaaaaaa....', '...abbbbbbbba...', '..abccbbbbbcba..', '.abbbbbbbbbbbba.', '.abbbddbbbbbbba.', '.abbbbbbbbbbbba.', '.abbbbbccbbbbba.',
    '.abbbbbbbbbbbba.', '.abbbbddbbbbbba.', '..abbbbbbbbbba..', '...abbbbbbbba...', '....aaaaaaaa....', '................', '................', '................']],
  pdoom: [{ a: '#A78BFA', b: '#1E1B4B', c: '#FACC15', d: '#F87171' }, [
    '......aaaa......', '....aabbbaaa....', '...aabbbbbbaa...', '..aabbbccbbbaa..', '..abbbccccbbba..', '.abbbbccccbbbba.', '.abbbbcdccbbbba.', '.abbbbccccbbbba.',
    '.abbbbccccbbbba.', '..abbbccccbbba..', '..aabbbccbbbaa..', '...aabbbbbbaa...', '....aaabbbaa....', '......aaaa......', '................', '................']],
  explainers: [{ a: '#38BDF8', b: '#0B1020', c: '#FFFFFF', d: '#FACC15' }, [
    '................', '..aaaaaaaaaaaa..', '.abbbbbbbbbbbba.', '.abccccccccccba.', '.abcddddddcccba.', '.abccccccccccba.', '.abcddddddcccba.', '.abccccccccccba.',
    '.abcddddddcccba.', '.abccccccccccba.', '.abbbbbbbbbbbba.', '..aaaaaaaaaaaa..', '.......dd.......', '......dddd......', '.......dd.......', '................']],
  defcon: [{ a: '#F87171', b: '#0B1020', c: '#FACC15', d: '#4ADE80' }, [
    '......cccc......', '.....cccccc.....', '....cccccccc....', '...cccccccccc...', '..cccccccccccc..', '.cccccccccccccc.', 'cccccccccccccccc', 'cccccbbbbbbccccc',
    'ccccbbaaaabbcccc', 'ccccbbaaaabbcccc', 'cccccbbbbbbccccc', 'cccccccccccccccc', '.ccccccddcccccc.', '..cccccccccccc..', '................', '................']],
  // 2026 midterms AI stance board: ballot box (room tile).
  ballot: [{ a: '#A5B4FC', b: '#1E1B4B', c: '#4ADE80', d: '#F87171', e: '#FACC15' }, [
    '.......ee.......', '......eeee......', '.....aeeeea.....', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aaaaaaaaaaaa..', '.aaaaaaaaaaaaaa.', 'aaaaaaaaaaaaaaaa',
    'abbbbbbbbbbbbbba', 'ab.cc....dd...ba', 'ab.ccc..dddd..ba', 'ab.cc....dd...ba', 'ab............ba', 'abbbbbbbbbbbbbba', '.aaaaaaaaaaaaaa.', '................']],
  // What's New twin for midterms (icons must stay unique per destination).
  midterm: [{ a: '#818CF8', b: '#0B1020', c: '#4ADE80', d: '#F87171', e: '#FDE68A' }, [
    '................', '....eeeeeeee....', '...eaaaaaaaae...', '..ea........ae..', '..ea.cc..dd.ae..', '..ea.ccc.ddd.ae.', '..ea.cc..dd.ae..', '..ea........ae..',
    '..eaaaaaaaaaae..', '...eeeeeeeeee...', '......bbbb......', '.....bbbbbb.....', '....bbbbbbbb....', '...bbbbbbbbbb...', '................', '................']],  // For People: two figures under a shared shelter — AI steered toward help.
  people: [{ a: '#4ADE80', b: '#166534', c: '#BBF7D0', d: '#60A5FA', e: '#1E3A8A', f: '#BFDBFE' }, [
    '................', '......aaaa......', '....aaaaaaaa....', '...aaaaaaaaaa...', '..aa........aa..', '..a..........a..', '................', '..bb......dd....',
    '.bbbb....dddd...', '.bcbcb..dfdfdf..', '.bbbb....dddd...', '..bb......dd....', '.cccc....ffff...', 'cccccc..ffffff..', '.c..c....f..f...', '................']],};

export function tileSvg(name, bg = '#0B1220') {
  const [pal, rows] = TILE_ICONS[name];
  let rects = '';
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (c) rects += `<rect x="${x + 2}" y="${y + 2}" width="1" height="1" fill="${c}"/>`; } });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="56" height="56" shape-rendering="crispEdges"><rect width="20" height="20" rx="3" fill="${bg}"/>${rects}</svg>`;
}
