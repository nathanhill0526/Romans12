import React, {useState, useEffect, useRef, useContext, createContext} from 'react';
import {SafeAreaView, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert, Platform, KeyboardAvoidingView, StatusBar, Switch} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------- constants ---------- */
const C = {sky:'#B5C9D6', wool:'#D1C1B6', ocean:'#7E9EB2', hazel:'#A47864', denim:'#3F5F76', choc:'#794E46', esp:'#35281F', paper:'#F4EEE9'};
const SERIF = Platform.select({ios:'Georgia', android:'serif', default:'Georgia'});
const KEY = 'romans12-rn-v1';
const PERMS = {post:'Create posts', reply:'Reply to posts', like:'Encourage and "I prayed" buttons', prayer:'Post on the prayer wall', submit:'Send private submissions',
  delete_any:"Delete anyone's posts, replies, prayers", answer_any:'Mark any prayer answered', view_submissions:'Read the submissions inbox',
  edit_content:'Edit verse, song, links', manage_users:'Add, disable, remove users', manage_roles:'Edit roles and sign-up settings'};
const ALL = Object.keys(PERMS), MEMBER = ['post','reply','like','prayer','submit'];
const SEED_ROLES = {admin:{label:'Admin', perms:ALL}, moderator:{label:'Moderator', perms:[...MEMBER,'delete_any','answer_any','view_submissions']},
  member:{label:'Member', perms:MEMBER}, guest:{label:'Guest (not logged in)', perms:['submit']}};
const BOARD_CATS = ['Discussion','Verse of the week','Song of the week','Testimony','Question'];
const STUDY = [
  {t:'Verses 1 to 2: Offer yourself', s:"Because of God's mercy, give your whole life to him and let him reshape how you think instead of copying the culture around you.", q:['What does a living sacrifice look like on a normal Tuesday?','What is one pattern of the world you want renewed in your mind?']},
  {t:'Verses 3 to 8: One body, many gifts', s:"Don't think too highly of yourself. Each person has a different gift, and the body needs all of them used faithfully.", q:['Which gift do you see in the person next to you?','Where are you tempted to compare instead of contribute?']},
  {t:'Verses 9 to 21: Love in action', s:'Real love hates evil, honors others, stays hopeful in trouble, welcomes strangers, blesses enemies, and answers evil with good.', q:['Who is hardest for you to bless right now?','What is one small act of hospitality you can do this week?']}];
const FAQ = [
  ['How do I get the weekly text?', 'Tap "Get the weekly text" on Home. It opens your messages with the keyword filled in. Just hit send.'],
  ['Do I need an account?', 'Anyone can read. To post, reply, or use the prayer wall you need an account.'],
  ['Can I post a prayer request anonymously?', 'Yes. Turn on "Post anonymously" on the prayer wall.'],
  ['I forgot my password', 'Ask an admin to set a new password for you.']];

/* ---------- helpers ---------- */
const clone = x => JSON.parse(JSON.stringify(x));
const rid = () => Math.random().toString(36).slice(2, 10);
const hs = (s, salt) => {s = salt + s; let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0, c; i < s.length; i++) {c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677);}
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);};
const ago = t => {const m = Math.floor((Date.now() - t) / 6e4); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.floor(m / 60); if (h < 24) return h + ' hr ago'; const d = Math.floor(h / 24); return d < 7 ? d + ' day' + (d > 1 ? 's' : '') + ' ago' : new Date(t).toLocaleDateString();};
const safeUrl = u => (/^(https?:\/\/|sms:)/i.test((u || '').trim()) ? u.trim() : '');
const confirmThen = (msg, fn) => Alert.alert('Are you sure?', msg, [{text:'Cancel', style:'cancel'}, {text:'Yes', style:'destructive', onPress:fn}]);

function seed() {
  const S = {users:{}, auth:{}, roles:clone(SEED_ROLES), settings:{allowSignup:true, signupRole:'member'}, posts:{}, prayers:{}, submissions:{}, session:null,
    content:{tagline:'Live as a living sacrifice. Weekly encouragement and conversation.', textLink:'sms:+15555550123?&body=Romans12', spotifyLink:'https://open.spotify.com/', submitLink:'',
      weeks:[{id:'w1', date:'This week', verse:'Do not be conformed to this world, but be transformed by the renewal of your mind.', ref:'Romans 12:2', song:'Song title here', artist:'Artist name', link:''}]}};
  const mk = (name, email, role, pw) => {const id = 'u' + rid(), salt = rid(); S.auth[email] = {uid:id, salt, h:hs(pw, salt)}; S.users[id] = {name, email, role, disabled:false, created:Date.now() - 1e6}; return id;};
  const a = mk('Admin', 'admin@demo.test', 'admin', 'admin123'); mk('Sam (Moderator)', 'mod@demo.test', 'moderator', 'mod12345'); const u = mk('Jordan', 'member@demo.test', 'member', 'member123');
  const t = Date.now();
  S.posts.p1 = {uid:a, name:'Admin', cat:'Verse of the week', text:'Welcome to Romans 12! What is one way you can offer yourself as a living sacrifice this week?', time:t - 36e5, likes:[u], replies:[{id:'r1', uid:u, name:'Jordan', text:'Starting with how I talk to my family at home.', time:t - 18e5}]};
  S.posts.p2 = {uid:u, name:'Jordan', cat:'Question', text:"How do you all handle verse 18 when someone just won't make peace?", time:t - 9e5, likes:[], replies:[]};
  S.prayers.q1 = {uid:u, name:'Jordan', kind:'Request', text:'Please pray for my finals next week.', time:t - 72e5, prayed:[a], answered:false};
  return S;
}

/* ---------- context ---------- */
const Ctx = createContext(null);
const useC = () => useContext(Ctx);

/* ---------- small UI ---------- */
const Btn = ({t, onPress, kind, disabled, style}) => (
  <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[st.btn, kind === 'danger' && {backgroundColor:'#8a3a2e'}, kind === 'ghost' && st.ghost, disabled && {opacity:0.5}, style]}>
    <Text style={[st.btnT, kind === 'ghost' && {color:C.denim}]}>{t}</Text>
  </TouchableOpacity>);
const Field = ({label, ...p}) => (
  <View style={{marginBottom:10}}><Text style={st.lab}>{label}</Text>
    <TextInput placeholderTextColor="#8a7f78" autoCapitalize="none" style={[st.input, p.multiline && {minHeight:90, textAlignVertical:'top'}]} {...p} /></View>);
const Chips = ({list, val, set}) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginVertical:10, flexGrow:0}}>
    {list.map(c => <TouchableOpacity key={c} onPress={() => set(c)} style={[st.chip, val === c && st.chipOn]}><Text style={[st.chipT, val === c && {color:C.paper}]}>{c}</Text></TouchableOpacity>)}
  </ScrollView>);
const Card = ({children, style}) => <View style={[st.card, style]}>{children}</View>;
const H2 = ({children}) => <Text style={st.h2}>{children}</Text>;
const H3 = ({children, style}) => <Text style={[st.h3, style]}>{children}</Text>;
const Note = ({children}) => <View style={st.note}><Text style={{color:C.esp}}>{children}</Text></View>;
const NeedLogin = ({msg}) => {const {go} = useC(); return <Note>{msg} <Text style={{fontWeight:'700', textDecorationLine:'underline'}} onPress={() => go('account')}>Log in or create an account</Text></Note>;};
const Meta = ({name, tag, time}) => (
  <View style={{flexDirection:'row', flexWrap:'wrap', alignItems:'center', gap:8}}>
    <Text style={{fontWeight:'700', color:C.esp}}>{name}</Text>
    {tag ? <Text style={st.tag}>{tag}</Text> : null}<Text style={{color:C.choc, fontSize:12}}>{ago(time)}</Text>
  </View>);
const open = url => {const u = safeUrl(url); if (u) Linking.openURL(u).catch(() => {});};

/* ---------- screens ---------- */
function Home() {
  const {S} = useC(); const c = S.content, w = c.weeks[0] || {};
  const latest = Object.values(S.posts).sort((a, b) => b.time - a.time).slice(0, 3);
  return (<View>
    {c.textLink ? <TouchableOpacity style={[st.link, {backgroundColor:C.choc}]} onPress={() => open(c.textLink)}><Text style={st.linkT}>Get the weekly text</Text><Text style={st.linkS}>Join the text message list</Text></TouchableOpacity> : null}
    {c.spotifyLink ? <TouchableOpacity style={[st.link, {backgroundColor:C.hazel}]} onPress={() => open(c.spotifyLink)}><Text style={st.linkT}>Listen on Spotify</Text><Text style={st.linkS}>Our playlist</Text></TouchableOpacity> : null}
    {c.submitLink ? <TouchableOpacity style={[st.link, {backgroundColor:C.ocean}]} onPress={() => open(c.submitLink)}><Text style={[st.linkT, {color:C.esp}]}>Romans 12 submission</Text><Text style={[st.linkS, {color:C.esp}]}>Opens the external form</Text></TouchableOpacity> : null}
    <Card><H3>Verse of the week</H3><Text style={st.verse}>{w.verse ? '\u201C' + w.verse + '\u201D' : ''}</Text><Text style={st.ref}>{w.ref}</Text></Card>
    <Card><H3>Song of the week</H3><Text style={{fontWeight:'700', color:C.esp}}>{w.song}</Text><Text style={{color:C.esp}}>{w.artist}</Text></Card>
    <Card><H3>Latest on the board</H3>{latest.length ? latest.map((p, i) => <Text key={i} style={{marginTop:6, color:C.esp}}><Text style={{fontWeight:'700'}}>{p.name}: </Text>{p.text.length > 100 ? p.text.slice(0, 100) + '...' : p.text}</Text>) : <Text>No posts yet.</Text>}</Card>
  </View>);
}

function PostCard({p}) {
  const {S, user, can, mut, say} = useC(); const [r, setR] = useState('');
  const liked = user && p.likes.includes(user.id), mine = user && p.uid === user.id;
  return (<View style={[st.post, {borderLeftColor:C.ocean}]}>
    <Meta name={p.name} tag={p.cat} time={p.time} /><Text style={st.body}>{p.text}</Text>
    <View style={{flexDirection:'row', gap:18}}>
      <TouchableOpacity disabled={!user || !can('like')} onPress={() => mut(n => {const q = n.posts[p.id]; q.likes = liked ? q.likes.filter(x => x !== user.id) : [...q.likes, user.id];})}>
        <Text style={[st.act, (!user || !can('like')) && {opacity:0.4}]}>{liked ? 'Encouraged' : 'Encourage'}{p.likes.length ? ' (' + p.likes.length + ')' : ''}</Text></TouchableOpacity>
      {(mine || can('delete_any')) && <TouchableOpacity onPress={() => confirmThen('Delete this post?', () => mut(n => {delete n.posts[p.id];}))}><Text style={st.act}>Delete</Text></TouchableOpacity>}
    </View>
    <View style={st.replies}>
      {p.replies.map(x => (<View key={x.id} style={{marginVertical:6}}><Meta name={x.name} time={x.time} /><Text style={st.body}>{x.text}</Text>
        {((user && x.uid === user.id) || can('delete_any')) && <TouchableOpacity onPress={() => mut(n => {n.posts[p.id].replies = n.posts[p.id].replies.filter(y => y.id !== x.id);})}><Text style={st.act}>Delete</Text></TouchableOpacity>}</View>))}
      {user && can('reply') && (<View style={{flexDirection:'row', gap:8, marginTop:8}}>
        <TextInput style={[st.input, {flex:1}]} placeholder="Write a reply" value={r} onChangeText={setR} maxLength={800} />
        <Btn t="Reply" onPress={() => {if (!r.trim()) return; mut(n => {n.posts[p.id].replies.push({id:rid(), uid:user.id, name:user.name, text:r.trim(), time:Date.now()});}); setR('');}} /></View>)}
    </View></View>);
}

function Board() {
  const {S, user, can, mut, say} = useC(); const [f, setF] = useState('All'), [cat, setCat] = useState('Discussion'), [txt, setTxt] = useState('');
  const list = Object.entries(S.posts).map(([id, p]) => ({id, ...p})).filter(p => f === 'All' || p.cat === f).sort((a, b) => b.time - a.time);
  return (<View>
    <H2>Discussion board</H2><Text style={st.sub}>Talk about the week's verse, share what you're learning, ask questions.</Text>
    <Chips list={['All', ...BOARD_CATS]} val={f} set={setF} />
    {user && can('post') ? (<View style={st.form}><Text style={st.lab}>Topic</Text><Chips list={BOARD_CATS} val={cat} set={setCat} />
      <Field label="Your post" multiline value={txt} onChangeText={setTxt} maxLength={1500} />
      <Btn t="Post to the board" onPress={() => {if (!txt.trim()) return; mut(n => {n.posts[rid()] = {uid:user.id, name:user.name, cat, text:txt.trim(), time:Date.now(), likes:[], replies:[]};}); setTxt(''); say('Posted');}} /></View>)
      : <NeedLogin msg="You need an account with posting permission to join the conversation." />}
    {list.length ? list.map(p => <PostCard key={p.id} p={p} />) : <Text style={st.empty}>Nothing here yet. Start the conversation.</Text>}
  </View>);
}

function Prayer() {
  const {S, user, can, mut, say} = useC(); const [f, setF] = useState('All'), [kind, setKind] = useState('Request'), [txt, setTxt] = useState(''), [anon, setAnon] = useState(false);
  const list = Object.entries(S.prayers).map(([id, p]) => ({id, ...p})).filter(p => f === 'All' || (f === 'Answered' ? p.answered : (!p.answered && p.kind === f))).sort((a, b) => b.time - a.time);
  return (<View>
    <H2>Prayer wall</H2><Text style={st.sub}>Share a request or a praise report. Tap "I prayed" so people know they're not alone.</Text>
    <Chips list={['All', 'Request', 'Praise report', 'Answered']} val={f} set={setF} />
    {user && can('prayer') ? (<View style={st.form}><Chips list={['Request', 'Praise report']} val={kind} set={setKind} />
      <Field label="What can we pray for?" multiline value={txt} onChangeText={setTxt} maxLength={1000} />
      <View style={{flexDirection:'row', alignItems:'center', marginBottom:10}}><Switch value={anon} onValueChange={setAnon} /><Text style={{marginLeft:8, color:C.esp}}>Post anonymously</Text></View>
      <Btn t="Add to the prayer wall" onPress={() => {if (!txt.trim()) return; mut(n => {n.prayers[rid()] = {uid:user.id, name:anon ? 'Anonymous' : user.name, kind, text:txt.trim(), time:Date.now(), prayed:[], answered:false};}); setTxt(''); say('Added');}} /></View>)
      : <NeedLogin msg="You need an account with prayer wall permission to post." />}
    {list.length ? list.map(p => {const did = user && p.prayed.includes(user.id), mine = user && p.uid === user.id;
      return (<View key={p.id} style={[st.post, {borderLeftColor:p.answered ? C.denim : C.hazel}, p.answered && {backgroundColor:'#EEF3F6'}]}>
        <Meta name={p.name} tag={p.answered ? 'Answered' : p.kind} time={p.time} /><Text style={st.body}>{p.text}</Text>
        <View style={{flexDirection:'row', gap:18, flexWrap:'wrap'}}>
          <TouchableOpacity disabled={!user || !can('like')} onPress={() => mut(n => {const q = n.prayers[p.id]; q.prayed = did ? q.prayed.filter(x => x !== user.id) : [...q.prayed, user.id];})}>
            <Text style={[st.act, (!user || !can('like')) && {opacity:0.4}]}>{did ? 'You prayed' : 'I prayed'}{p.prayed.length ? ' (' + p.prayed.length + ')' : ''}</Text></TouchableOpacity>
          {p.kind === 'Request' && (mine || can('answer_any')) && <TouchableOpacity onPress={() => mut(n => {n.prayers[p.id].answered = !p.answered;})}><Text style={st.act}>{p.answered ? 'Reopen' : 'Mark answered'}</Text></TouchableOpacity>}
          {(mine || can('delete_any')) && <TouchableOpacity onPress={() => confirmThen('Delete this request?', () => mut(n => {delete n.prayers[p.id];}))}><Text style={st.act}>Delete</Text></TouchableOpacity>}
        </View></View>);}) : <Text style={st.empty}>No prayers in this view yet.</Text>}
  </View>);
}

function More() {
  const {S, user, can, mut, say} = useC(); const [sec, setSec] = useState(null), [open_, setOpen] = useState(-1);
  const [kind, setKind] = useState('Testimony'), [name, setName] = useState(''), [contact, setContact] = useState(''), [txt, setTxt] = useState('');
  if (!sec) return (<View><H2>More</H2>{[['weekly', 'Weekly verse and song'], ['study', 'Study Romans 12'], ['submit', 'Submit to Romans 12'], ['about', 'About and FAQ']].map(([k, l]) =>
    <TouchableOpacity key={k} style={st.menuRow} onPress={() => setSec(k)}><Text style={st.menuT}>{l}</Text><Text style={{color:C.choc, fontSize:20}}>{'\u203A'}</Text></TouchableOpacity>)}</View>);
  return (<View><TouchableOpacity onPress={() => setSec(null)}><Text style={[st.act, {marginBottom:10}]}>{'\u2039'} Back</Text></TouchableOpacity>
    {sec === 'weekly' && (<View><H2>Weekly verse and song</H2>{S.content.weeks.map(w => (<View key={w.id} style={[st.post, {borderLeftColor:C.hazel}]}><H3>{w.date}</H3><Text style={st.verse}>{'\u201C' + w.verse + '\u201D'}</Text><Text style={st.ref}>{w.ref}</Text>
      <Text style={{marginTop:8, color:C.esp}}><Text style={{fontWeight:'700'}}>Song: </Text>{w.song} by {w.artist}</Text>{w.link ? <Text style={[st.act, {marginTop:4}]} onPress={() => open(w.link)}>Listen</Text> : null}</View>))}</View>)}
    {sec === 'study' && (<View><H2>Study Romans 12</H2>{STUDY.map(s => (<Card key={s.t}><H3>{s.t}</H3><Text style={{color:C.esp}}>{s.s}</Text>{s.q.map((q, i) => <Text key={i} style={{marginTop:6, color:C.esp}}>{(i + 1) + '. ' + q}</Text>)}</Card>))}</View>)}
    {sec === 'about' && (<View><H2>About and FAQ</H2>{FAQ.map(([q, a], i) => (<TouchableOpacity key={q} style={st.faq} onPress={() => setOpen(open_ === i ? -1 : i)}><Text style={{fontWeight:'700', color:C.denim}}>{q}</Text>{open_ === i && <Text style={{marginTop:6, color:C.esp}}>{a}</Text>}</TouchableOpacity>))}</View>)}
    {sec === 'submit' && (<View><H2>Submit to Romans 12</H2><Text style={st.sub}>Send a testimony, a song or verse idea, or a question. Only the Romans 12 team sees these.</Text>
      {can('submit') ? (<View style={st.form}><Chips list={['Testimony', 'Song suggestion', 'Verse suggestion', 'Question', 'Something else']} val={kind} set={setKind} />
        {!user && <Field label="Your name" value={name} onChangeText={setName} maxLength={40} />}
        <Field label="Phone or email (optional)" value={contact} onChangeText={setContact} maxLength={80} />
        <Field label="Your message" multiline value={txt} onChangeText={setTxt} maxLength={2000} />
        <Btn t="Send submission" onPress={() => {if (!txt.trim()) return; mut(n => {n.submissions[rid()] = {name:user ? user.name : (name.trim() || 'Guest'), kind, contact:contact.trim(), text:txt.trim(), time:Date.now()};}); setTxt(''); say('Sent. Thank you!');}} /></View>)
        : <NeedLogin msg="Submissions are turned off for your account." />}</View>)}
  </View>);
}

function Account() {
  const {S, user, mut, say, go, reset} = useC();
  const [em, setEm] = useState(''), [pw, setPw] = useState(''), [nm, setNm] = useState(''), [em2, setEm2] = useState(''), [pw2, setPw2] = useState(''), [o, setO] = useState(''), [n_, setN] = useState('');
  const login = () => {const r = S.auth[em.trim().toLowerCase()]; if (!r || r.h !== hs(pw, r.salt)) return say('Wrong email or password.');
    if (S.users[r.uid] && S.users[r.uid].disabled) return say('This account is disabled.'); mut(n => {n.session = r.uid;}); setPw(''); go('home');};
  const signup = () => {const e = em2.trim().toLowerCase(); if (!nm.trim() || !e.includes('@')) return say('Enter your name and a valid email.'); if (S.auth[e]) return say('That email already has an account.'); if (pw2.length < 8) return say('Password must be at least 8 characters.');
    mut(n => {const id = 'u' + rid(), salt = rid(); n.auth[e] = {uid:id, salt, h:hs(pw2, salt)}; n.users[id] = {name:nm.trim(), email:e, role:n.settings.signupRole, disabled:false, created:Date.now()}; n.session = id;}); go('home'); say('Welcome!');};
  if (user) return (<View><H2>Account</H2><Card><H3>Signed in as {user.name}</H3><Text style={{color:C.esp}}>{user.email}  |  Role: {user.role}</Text><Btn t="Log out" style={{marginTop:12}} onPress={() => mut(n => {n.session = null;})} /></Card>
    <H3 style={{marginTop:16}}>Change password</H3><View style={st.form}><Field label="Current password" secureTextEntry value={o} onChangeText={setO} /><Field label="New password (8+ characters)" secureTextEntry value={n_} onChangeText={setN} />
      <Btn t="Change password" onPress={() => {const r = S.auth[user.email]; if (r.h !== hs(o, r.salt)) return say('Current password is wrong.'); if (n_.length < 8) return say('Use at least 8 characters.');
        mut(n => {const a = n.auth[user.email]; a.salt = rid(); a.h = hs(n_, a.salt);}); setO(''); setN(''); say('Password changed');}} /></View>
    <H3 style={{marginTop:16}}>Demo data</H3><Btn kind="danger" t="Reset demo data" onPress={reset} /></View>);
  return (<View><H2>Log in</H2>
    <Note>{'Demo logins:\nadmin@demo.test / admin123 (admin)\nmod@demo.test / mod12345 (moderator)\nmember@demo.test / member123 (member)'}</Note>
    <View style={st.form}><Field label="Email" keyboardType="email-address" value={em} onChangeText={setEm} /><Field label="Password" secureTextEntry value={pw} onChangeText={setPw} /><Btn t="Log in" onPress={login} /></View>
    {S.settings.allowSignup ? (<View><H3>Create an account</H3><View style={st.form}><Field label="Your name" autoCapitalize="words" value={nm} onChangeText={setNm} maxLength={30} />
      <Field label="Email" keyboardType="email-address" value={em2} onChangeText={setEm2} /><Field label="Password (8+ characters)" secureTextEntry value={pw2} onChangeText={setPw2} /><Btn t="Sign up" onPress={signup} /></View></View>)
      : <Note>Sign-up is closed. Ask an admin to create an account for you.</Note>}
    <Btn kind="danger" t="Reset demo data" onPress={reset} style={{marginTop:14}} /></View>);
}

/* ---------- admin ---------- */
function Admin() {
  const {S, user, can} = useC(); const tabs = [['users', 'Users', 'manage_users'], ['roles', 'Roles', 'manage_roles'], ['content', 'Content', 'edit_content'], ['inbox', 'Inbox', 'view_submissions']].filter(t => can(t[2]));
  const [t, setT] = useState(tabs[0] ? tabs[0][0] : '');
  const cur = tabs.some(x => x[0] === t) ? t : (tabs[0] || [''])[0];
  return (<View><H2>Admin panel</H2><Chips list={tabs.map(x => x[1])} val={(tabs.find(x => x[0] === cur) || [])[1]} set={l => setT(tabs.find(x => x[1] === l)[0])} />
    {cur === 'users' && <AdmUsers />}{cur === 'roles' && <AdmRoles />}{cur === 'content' && <AdmContent />}{cur === 'inbox' && <AdmInbox />}</View>);
}
function AdmUsers() {
  const {S, user, mut, say} = useC(); const isAdm = user.role === 'admin';
  const roleIds = Object.keys(S.roles).filter(r => r !== 'guest' && (r !== 'admin' || isAdm));
  const [nm, setNm] = useState(''), [em, setEm] = useState(''), [pw, setPw] = useState(''), [rl, setRl] = useState('member'), [pwFor, setPwFor] = useState(null), [np, setNp] = useState('');
  const users = Object.entries(S.users).map(([id, u]) => ({id, ...u})).sort((a, b) => a.created - b.created);
  const activeAdmins = id => users.filter(x => x.role === 'admin' && !x.disabled && x.id !== id).length;
  return (<View><H3>Create an account</H3><View style={st.form}><Field label="Name" value={nm} onChangeText={setNm} maxLength={30} autoCapitalize="words" /><Field label="Email" keyboardType="email-address" value={em} onChangeText={setEm} />
    <Field label="Temporary password (8+ characters)" value={pw} onChangeText={setPw} /><Text style={st.lab}>Role</Text><Chips list={roleIds} val={rl} set={setRl} />
    <Btn t="Create user" onPress={() => {const e = em.trim().toLowerCase(); if (!nm.trim() || !e.includes('@')) return say('Enter a name and valid email.'); if (S.auth[e]) return say('That email is taken.'); if (pw.length < 8) return say('Password needs 8+ characters.');
      mut(n => {const id = 'u' + rid(), salt = rid(); n.auth[e] = {uid:id, salt, h:hs(pw, salt)}; n.users[id] = {name:nm.trim(), email:e, role:rl, disabled:false, created:Date.now()};}); setNm(''); setEm(''); setPw(''); say('User created');}} /></View>
    <H3 style={{marginTop:12}}>All users ({users.length})</H3>
    {users.map(u => {const self = u.id === user.id, locked = u.role === 'admin' && !isAdm;
      return (<View key={u.id} style={st.urow}><Text style={[{fontWeight:'700', color:C.esp}, u.disabled && {opacity:0.5}]}>{u.name}{u.disabled ? ' (disabled)' : ''}</Text><Text style={{color:C.choc, fontSize:12}}>{u.email}</Text>
        {self ? <Text style={st.tag}>you</Text> : locked ? <Text style={st.tag}>admin</Text> : (<View>
          <Chips list={roleIds} val={u.role} set={r => {if (u.role === 'admin' && !activeAdmins(u.id)) return say('There must be at least one active admin.'); mut(n => {n.users[u.id].role = r;}); say('Role updated');}} />
          <View style={{flexDirection:'row', gap:8, flexWrap:'wrap'}}>
            <Btn kind="ghost" t={u.disabled ? 'Enable' : 'Disable'} onPress={() => {if (!u.disabled && u.role === 'admin' && !activeAdmins(u.id)) return say('There must be at least one active admin.'); mut(n => {n.users[u.id].disabled = !u.disabled; if (n.session === u.id && !u.disabled) n.session = null;});}} />
            <Btn kind="ghost" t="Set password" onPress={() => {setPwFor(pwFor === u.id ? null : u.id); setNp('');}} />
            <Btn kind="danger" t="Remove" onPress={() => {if (u.role === 'admin' && !activeAdmins(u.id)) return say('There must be at least one active admin.'); confirmThen('Remove ' + u.name + '? Their posts stay.', () => mut(n => {delete n.auth[u.email]; delete n.users[u.id];}));}} /></View>
          {pwFor === u.id && (<View style={{marginTop:8}}><Field label="New password (8+ characters)" value={np} onChangeText={setNp} />
            <Btn t="Save password" onPress={() => {if (np.length < 8) return say('Use at least 8 characters.'); mut(n => {const a = n.auth[u.email]; a.salt = rid(); a.h = hs(np, a.salt);}); setPwFor(null); say('Password updated');}} /></View>)}</View>)}</View>);})}
  </View>);
}
function RoleCard({id}) {
  const {S, user, mut, say} = useC(); const r = S.roles[id], isAdm = user.role === 'admin';
  const [perms, setPerms] = useState(r.perms), [label, setLabel] = useState(r.label);
  const myPerms = isAdm ? ALL : S.roles[user.role].perms;
  return (<View style={st.rolecard}><H3>{id}</H3><TextInput style={st.input} value={label} onChangeText={setLabel} editable={id !== 'admin'} maxLength={40} />
    {ALL.map(k => {const on = id === 'admin' || perms.includes(k), dis = id === 'admin' || (!isAdm && (!myPerms.includes(k) || id === user.role));
      return (<View key={k} style={{flexDirection:'row', alignItems:'center', marginTop:8}}><Switch disabled={dis} value={on} onValueChange={v => setPerms(v ? [...perms, k] : perms.filter(x => x !== k))} /><Text style={{marginLeft:8, flex:1, color:C.esp}}>{PERMS[k]}</Text></View>);})}
    {id !== 'admin' && (<View style={{flexDirection:'row', gap:8, marginTop:12}}><Btn t={'Save ' + id} onPress={() => {mut(n => {n.roles[id] = {label:label.trim() || id, perms};}); say('Saved');}} />
      {!['guest', 'member'].includes(id) && <Btn kind="danger" t="Delete role" onPress={() => {if (Object.values(S.users).some(u => u.role === id)) return say('Move its users to another role first.'); if (S.settings.signupRole === id) return say('This role is used for sign-ups.'); confirmThen('Delete role ' + id + '?', () => mut(n => {delete n.roles[id];}));}} />}</View>)}</View>);
}
function AdmRoles() {
  const {S, mut, say} = useC(); const [nid, setNid] = useState(''), [nl, setNl] = useState('');
  return (<View><Note>Admins always have every permission. Guest is what people who are not logged in can do.</Note>
    {Object.keys(S.roles).map(id => <RoleCard key={id + JSON.stringify(S.roles[id])} id={id} />)}
    <H3 style={{marginTop:12}}>New role</H3><View style={st.form}><Field label="Role id (lowercase, 2-20 letters)" value={nid} onChangeText={setNid} /><Field label="Display name" value={nl} onChangeText={setNl} />
      <Btn t="Create role" onPress={() => {const id = nid.trim().toLowerCase(); if (!/^[a-z0-9_-]{2,20}$/.test(id) || S.roles[id]) return say('Pick a unique id (letters, numbers, - _).'); mut(n => {n.roles[id] = {label:nl.trim() || id, perms:[]};}); setNid(''); setNl(''); say('Role created. Toggle its permissions and save.');}} /></View>
    <H3 style={{marginTop:12}}>Sign-up settings</H3><View style={st.form}>
      <View style={{flexDirection:'row', alignItems:'center', marginBottom:8}}><Switch value={S.settings.allowSignup} onValueChange={v => mut(n => {n.settings.allowSignup = v;})} /><Text style={{marginLeft:8, color:C.esp}}>Let anyone create their own account</Text></View>
      <Text style={st.lab}>Role given to new sign-ups</Text><Chips list={Object.keys(S.roles).filter(r => !['admin', 'guest'].includes(r))} val={S.settings.signupRole} set={r => mut(n => {n.settings.signupRole = r;})} /></View></View>);
}
function AdmContent() {
  const {S, mut, say} = useC(); const c = S.content;
  const [tag, setTag] = useState(c.tagline), [tl, setTl] = useState(c.textLink), [sp, setSp] = useState(c.spotifyLink), [sb, setSb] = useState(c.submitLink);
  const [d, setD] = useState(''), [v, setV] = useState(''), [rf, setRf] = useState(''), [so, setSo] = useState(''), [ar, setAr] = useState(''), [lk, setLk] = useState('');
  return (<View><H3>Links and tagline</H3><View style={st.form}><Field label="Tagline" value={tag} onChangeText={setTag} /><Field label="Text message link (sms:+1555...?&body=Romans12)" value={tl} onChangeText={setTl} />
    <Field label="Spotify link" value={sp} onChangeText={setSp} /><Field label="External submission link" value={sb} onChangeText={setSb} />
    <Btn t="Save links" onPress={() => {mut(n => {n.content.tagline = tag; n.content.textLink = safeUrl(tl); n.content.spotifyLink = safeUrl(sp); n.content.submitLink = safeUrl(sb);}); say('Saved');}} /></View>
    <H3 style={{marginTop:12}}>Add a week</H3><View style={st.form}><Field label="Label (e.g. Oct 26)" value={d} onChangeText={setD} /><Field label="Verse text" multiline value={v} onChangeText={setV} /><Field label="Reference" value={rf} onChangeText={setRf} />
      <Field label="Song title" value={so} onChangeText={setSo} /><Field label="Artist" value={ar} onChangeText={setAr} /><Field label="Song link (optional)" value={lk} onChangeText={setLk} />
      <Btn t="Add to the top" onPress={() => {if (!d.trim() || !v.trim() || !rf.trim() || !so.trim()) return say('Fill in the label, verse, reference and song.'); mut(n => {n.content.weeks.unshift({id:rid(), date:d.trim(), verse:v.trim(), ref:rf.trim(), song:so.trim(), artist:ar.trim(), link:/^https?:\/\//i.test(lk.trim()) ? lk.trim() : ''});}); setD(''); setV(''); setRf(''); setSo(''); setAr(''); setLk(''); say('Week added');}} /></View>
    <H3 style={{marginTop:12}}>Existing weeks</H3>{c.weeks.map(w => (<View key={w.id} style={st.urow}><Text style={{color:C.esp, fontWeight:'700'}}>{w.date}: {w.ref} / {w.song}</Text>
      <Btn kind="danger" t="Remove" style={{marginTop:8, alignSelf:'flex-start'}} onPress={() => confirmThen('Remove this week?', () => mut(n => {n.content.weeks = n.content.weeks.filter(x => x.id !== w.id);}))} /></View>))}</View>);
}
function AdmInbox() {
  const {S, mut} = useC(); const list = Object.entries(S.submissions).map(([id, s]) => ({id, ...s})).sort((a, b) => b.time - a.time);
  if (!list.length) return <Text style={st.empty}>No submissions yet.</Text>;
  return (<View>{list.map(s => (<View key={s.id} style={[st.post, {borderLeftColor:C.ocean}]}><Meta name={s.name} tag={s.kind} time={s.time} />{s.contact ? <Text style={{color:C.choc, fontSize:12}}>Reply to: {s.contact}</Text> : null}
    <Text style={st.body}>{s.text}</Text><TouchableOpacity onPress={() => mut(n => {delete n.submissions[s.id];})}><Text style={st.act}>Delete</Text></TouchableOpacity></View>))}</View>);
}

/* ---------- app shell ---------- */
export default function App() {
  const [S, setS] = useState(null), ref = useRef(null), [tab, setTab] = useState('home'), [toast, setToast] = useState('');
  useEffect(() => {AsyncStorage.getItem(KEY).then(v => {let d = null; try {d = v && JSON.parse(v);} catch (e) {} const s = d && d.users ? d : seed(); ref.current = s; setS(s);});}, []);
  if (!S) return <SafeAreaView style={st.fill}><Text style={{padding:20, color:C.esp}}>Loading...</Text></SafeAreaView>;
  const mut = fn => {const n = clone(ref.current); fn(n); ref.current = n; setS(n); AsyncStorage.setItem(KEY, JSON.stringify(n)).catch(() => {});};
  const say = m => {setToast(m); setTimeout(() => setToast(''), 2600);};
  const reset = () => confirmThen('Wipe all demo data on this phone?', () => {const n = seed(); ref.current = n; setS(n); AsyncStorage.setItem(KEY, JSON.stringify(n)); setTab('home'); say('Demo data reset');});
  const u = S.session && S.users[S.session] && !S.users[S.session].disabled ? {id:S.session, ...S.users[S.session]} : null;
  const perms = u ? (u.role === 'admin' ? ALL : (S.roles[u.role] || {perms:[]}).perms) : S.roles.guest.perms;
  const can = k => perms.includes(k), canAdmin = ['manage_users', 'manage_roles', 'edit_content', 'view_submissions'].some(can);
  const ctx = {S, user:u, can, mut, say, go:setTab, reset};
  const tabs = [['home', 'Home'], ['board', 'Board'], ['prayer', 'Prayer'], ['more', 'More'], ['account', u ? 'Account' : 'Log in']]; if (canAdmin) tabs.push(['admin', 'Admin']);
  const Screen = {home:Home, board:Board, prayer:Prayer, more:More, account:Account, admin:canAdmin ? Admin : Home}[tab] || Home;
  return (<Ctx.Provider value={ctx}><SafeAreaView style={st.fill}><StatusBar barStyle="light-content" backgroundColor={C.denim} />
    <View style={st.header}><Text style={st.title}>Romans 12</Text><Text style={st.tagline}>{S.content.tagline}</Text>{u ? <Text style={st.who}>Signed in as {u.name}</Text> : null}</View>
    <KeyboardAvoidingView style={st.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={st.fill} contentContainerStyle={{padding:16, paddingBottom:40}} keyboardShouldPersistTaps="handled"><Screen /></ScrollView></KeyboardAvoidingView>
    {toast ? <View style={st.toast}><Text style={{color:C.paper}}>{toast}</Text></View> : null}
    <View style={st.tabbar}>{tabs.map(([k, l]) => (<TouchableOpacity key={k} style={st.tabBtn} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{selected:tab === k}}>
      <View style={[st.dot, tab === k && {backgroundColor:C.denim}]} /><Text style={[st.tabT, tab === k && {color:C.denim, fontWeight:'700'}]}>{l}</Text></TouchableOpacity>))}</View>
  </SafeAreaView></Ctx.Provider>);
}

/* ---------- styles ---------- */
const st = StyleSheet.create({
  fill:{flex:1, backgroundColor:C.paper},
  header:{backgroundColor:C.denim, paddingHorizontal:16, paddingTop:Platform.OS === 'android' ? 30 : 10, paddingBottom:12, alignItems:'center'},
  title:{fontFamily:SERIF, fontSize:34, fontWeight:'700', color:C.paper}, tagline:{fontFamily:SERIF, fontSize:15, color:C.sky, textAlign:'center'}, who:{fontSize:12, color:C.sky, marginTop:4},
  h2:{fontFamily:SERIF, fontSize:28, fontWeight:'700', color:C.denim, marginBottom:4}, h3:{fontFamily:SERIF, fontSize:20, fontWeight:'700', color:C.choc, marginBottom:4},
  sub:{color:C.choc, marginBottom:8}, empty:{textAlign:'center', color:C.choc, fontFamily:SERIF, fontSize:18, padding:24},
  card:{backgroundColor:C.wool, padding:16, borderRadius:8, marginTop:12}, note:{backgroundColor:C.wool, padding:12, borderRadius:8, marginVertical:10},
  verse:{fontFamily:SERIF, fontSize:20, lineHeight:27, color:C.esp}, ref:{fontWeight:'700', fontSize:13, color:C.choc, marginTop:6},
  link:{padding:16, borderRadius:8, marginBottom:10}, linkT:{color:C.paper, fontWeight:'700', fontSize:16}, linkS:{color:C.paper, opacity:0.88, fontSize:13},
  form:{backgroundColor:C.sky, padding:14, borderRadius:8, marginVertical:8}, lab:{fontWeight:'700', fontSize:13, color:C.esp, marginBottom:4},
  input:{backgroundColor:'#fff', borderRadius:6, paddingHorizontal:12, paddingVertical:10, fontSize:16, color:C.esp, borderWidth:2, borderColor:'transparent'},
  btn:{backgroundColor:C.choc, paddingVertical:11, paddingHorizontal:16, borderRadius:6, alignItems:'center'}, btnT:{color:C.paper, fontWeight:'700'},
  ghost:{backgroundColor:'transparent', borderWidth:2, borderColor:C.ocean}, chip:{paddingVertical:6, paddingHorizontal:14, borderRadius:99, borderWidth:2, borderColor:C.ocean, marginRight:8},
  chipOn:{backgroundColor:C.denim, borderColor:C.denim}, chipT:{color:C.denim, fontWeight:'500'},
  post:{backgroundColor:'#fff', borderLeftWidth:6, borderRadius:6, padding:14, marginTop:12}, body:{marginVertical:8, color:C.esp, fontSize:16, lineHeight:22},
  act:{color:C.denim, fontWeight:'700', fontSize:14, paddingVertical:4}, replies:{marginLeft:10, paddingLeft:12, borderLeftWidth:3, borderLeftColor:C.wool, marginTop:6},
  tag:{backgroundColor:C.wool, paddingHorizontal:9, paddingVertical:1, borderRadius:99, fontSize:12, color:C.esp, overflow:'hidden'},
  menuRow:{backgroundColor:'#fff', padding:16, borderRadius:8, marginTop:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}, menuT:{fontSize:17, fontWeight:'700', color:C.denim},
  faq:{backgroundColor:'#fff', padding:14, borderRadius:8, marginTop:10}, urow:{backgroundColor:'#fff', borderRadius:8, padding:14, marginTop:10}, rolecard:{backgroundColor:'#fff', borderRadius:8, padding:14, marginTop:12},
  tabbar:{flexDirection:'row', backgroundColor:'#fff', borderTopWidth:1, borderTopColor:C.wool, paddingBottom:Platform.OS === 'ios' ? 16 : 6, paddingTop:6},
  tabBtn:{flex:1, alignItems:'center', paddingVertical:4}, tabT:{fontSize:11, color:C.choc, marginTop:2}, dot:{width:8, height:8, borderRadius:4, backgroundColor:C.wool},
  toast:{position:'absolute', left:20, right:20, bottom:84, backgroundColor:C.esp, padding:12, borderRadius:8, alignItems:'center'},
});
