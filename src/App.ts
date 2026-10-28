import { icon } from './icons.ts';
import type { Find, FullFind, Profile, Settings, Sketch } from './types.ts';
import {
  allCustomHunts, allFinds, allHuntRuns, allProfiles, deleteAllFinds, deleteCustomHunt, deleteFind, deleteProfile,
  loadSettings, migrateToProfiles, saveCustomHunt, saveFind, saveHuntRun, saveProfile, saveSettings,
  allWalks, saveWalk, deleteWalk, allSketches, saveSketch, deleteSketch, getFullFind, getFindMedia, saveFindInfo,
} from './storage.ts';
import { PathRecorder } from './recorder.ts';
import { closeOrphan, distanceWords, durationWords, segmentsAtGaps, walkDurationMs, walkLengthM, type Walk, type WalkPoint } from './walk.ts';
import { finishWalk, openWalks, type WalkHost } from './walkScreens.ts';
import type { BadgeExtras } from './badges.ts';
import { MapView, type Face } from './mapView.ts';
import { mapPicture } from './avatarArt.ts';
import { artUrl } from './avatars.ts';
import { fixProblem, knownFix, lastFix, onFix, refreshFix, startGps, steadiedFix, steadyNow } from './gps.ts';
import { addToTrail, loadToday, trailLengthM } from './trail.ts';
import { askYesNo, h, toast, uid } from './ui.ts';
import { say, setNarrator, setReadAloud, setVoice, setVoiceMode } from './speech.ts';
import { setSounds, sounds } from './sound.ts';
import { startCapture } from './capture.ts';
import { FINDS_CHANGED, celebrate, openCrew, openBadges, openBook, openChallenges, openFind, todaysChallenges, type ScreenHost } from './screens.ts';
import { newlyEarned, toBadgeFind } from './badges.ts';
import { askGrownUp } from './gateView.ts';
import { openGrownUps } from './grownUps.ts';
import { welcome } from './welcome.ts';
import { BuddyDock, setGuideName } from './buddyView.ts';
import { greet, tip } from './buddyLines.ts';
import { huntProgress, openItems, tick, type Hunt, type HuntRun } from './hunts.ts';
import { activeRun, openHunts, type HuntHost } from './huntScreens.ts';
import { openTickCheck } from './tickScreen.ts';
import { recordCheck } from './tickGuide.ts';
import { localDay } from './geo.ts';
import { guideName, normalizeGuide } from './guides.ts';
import { openProfiles, profileFace, type ProfileHost } from './profiles.ts';
import { pickOnMap } from './mapPicker.ts';
import { applyLook } from './lookApply.ts';
import { tierOf } from './tiers.ts';
import { openLook } from './lookScreen.ts';
import { openMyButtons } from './buttonsScreen.ts';
import { openLaunch } from './launch.ts';
import { openHelp } from './help.ts';
import { openMapSheet } from './basemapPicker.ts';
import { Compass } from './compass.ts';
import { setKeepAwake, wakeLockSupported } from './wakeLock.ts';
import { compassWord, smoothHeading } from './heading.ts';
import { MAX_QUICK, quickFor, quickKinds } from './quickFinds.ts';
import { closeDrawTool, openDrawTool, type DrawHost, type DrawMode } from './drawTool.ts';
import { closeShapeCard, openShapeCard } from './shapeCard.ts';
import { SHAPE_TAP_PX, metresPerPixel, pickShape } from './mapShapes.ts';
import { TOOLS, railFor, type ToolId } from './railTools.ts';
import { categoryOf } from './categories.ts';
import { downscale } from './image.ts';
import { meetsRule } from './hunts.ts';

export class App {
  private settings!: Settings;
  private profiles: Profile[] = [];
  private profile!: Profile;
  /** Every explorer's finds; `finds` is the active explorer's. */
  private everyFind: Find[] = [];
  private finds: Find[] = [];
  private everyRun: HuntRun[] = [];
  private runs: HuntRun[] = [];
  private custom: Hunt[] = [];
  private map = new MapView();
  private hello!: HTMLElement;
  private starBtn!: HTMLElement;
  private gpsNote!: HTMLElement;
  private walkNote!: HTMLElement;
  private huntChip!: HTMLElement;
  private dock!: BuddyDock;
  private recBtn!: HTMLElement;
  private recChip!: HTMLElement;
  private recTimer: number | undefined;
  private recorder = new PathRecorder();
  private compass = new Compass();
  private meBtn!: HTMLElement;
  private quickRow!: HTMLElement;
  private facingDeg: number | null = null;
  private everyWalk: Walk[] = [];
  private walks: Walk[] = [];
  private everySketch: Sketch[] = [];
  private sketches: Sketch[] = [];
  /** Every rail button, made once; `paintRail` shows the explorer's own choice of them. */
  private toolBtns = new Map<ToolId, HTMLElement>();
  private railBody!: HTMLElement;
  private drawing: DrawMode | null = null;
  /** The drawing being changed in ✏️ Draw: left off the map while its dots are drawn as the draft (paintSketches). */
  private editingSketchId: string | null = null;

  async init(): Promise<void> {
    this.settings = await loadSettings();
    this.profiles = await migrateToProfiles();
    if (!this.profiles.length) this.profiles = await allProfiles();
    // Re-read: the migration rewrote the settings record.
    this.settings = await loadSettings();
    this.everyFind = await allFinds();
    this.everyRun = await allHuntRuns();
    this.custom = await allCustomHunts();
    // A path that was recording when the app closed ends at its last point.
    this.everyWalk = await Promise.all((await allWalks()).map(async w => {
      if (w.endedAt) return w;
      const closed = closeOrphan(w);
      await saveWalk(closed);
      return closed;
    }));
    this.everySketch = await allSketches();
    this.applyAudio();
    const first = this.profiles.find(p => p.id === this.settings.activeProfileId) ?? this.profiles[0];
    this.profile = first ?? { id: '', name: '', avatar: '🦊', mode: 'explorer', guide: 'frog', createdAt: '' };
    this.scopeToProfile();
    this.buildChrome();
    await this.map.mount(document.getElementById('map')!, this.mapFace(), this.settings.basemap);
    this.map.onFindTap = id => openFind(this.screenHost(), id, () => this.refresh());
    // Press and hold the map: a find already placed on that spot. Not while a spot is being picked for a find.
    this.map.onLongPress = at => {
      if (document.body.classList.contains('picking') || document.querySelector('.sheet')) return;
      say('Ooh, right here! What did you find?');
      void this.capture(undefined, at);
    };
    // Dragging the map to look around stops following (see meTap).
    this.map.onUserPan = () => { if (this.settings.follow) void this.setFollow(false); };
    // A tap on a drawing or a path opens its card; a tap on empty map closes it.
    this.map.onMapTap = at => this.tapShape(at);
    this.map.setFinds(this.finds);
    this.paintSketches();
    if (!first) {
      const p = await saveProfile(await welcome());
      this.profiles = [p];
      await this.switchTo(p.id);
    } else {
      // The opening screen, once per launch (a page load); never on coming back from another app.
      await openLaunch({
        profiles: () => this.profiles,
        active: () => this.profile,
        switchTo: id => this.switchTo(id),
        addExplorer: () => openProfiles(this.profileHost()),
        openFinds: () => openBook(this.screenHost()),
        openBadges: () => openBadges(this.screenHost()),
        openLook: () => openLook(this.profile, p => this.profileHost().save(p)),
        openButtons: () => openMyButtons(this.profile, p => this.profileHost().save(p), () => quickKinds(this.finds, MAX_QUICK)),
        openHelp: () => openHelp(this.profile.guide),
        openGrownUps: () => void this.openGrownUpCorner(),
      });
    }
    if (this.map.offline) toast('🌧️ No internet, so the map is plain today. Your finds still work!', 4500);
    this.startLocation();
    const t = await loadToday();
    this.map.setTrail(t.points, this.settings.trail);
    this.paintWalk(t.points.length ? trailLengthM(t) : 0);
    this.drawWalks();
    const hi = greet(this.profile.guide);
    this.dock.speak({ ...hi, text: this.profile.name ? `Hi ${this.profile.name}! ${hi.text}` : hi.text });
  }

  /** The finds and hunts on screen are the active explorer's (old records with no owner count as theirs). */
  private scopeToProfile(): void {
    const mine = (x: { profileId?: string }) => !x.profileId || x.profileId === this.profile.id;
    this.finds = this.everyFind.filter(mine);
    this.runs = this.everyRun.filter(mine);
    this.walks = this.everyWalk.filter(mine);
    this.sketches = this.everySketch.filter(mine);
    this.profile.guide = normalizeGuide(this.profile.guide);
    setGuideName(this.profile.guide, guideName(this.profile.guide, this.profile.guideName));
    setNarrator(this.profile.guide);
  }

  private async switchTo(id: string): Promise<void> {
    const p = this.profiles.find(x => x.id === id);
    if (!p) return;
    this.profile = p;
    this.settings = { ...this.settings, activeProfileId: id };
    await saveSettings(this.settings);
    closeDrawTool();
    closeShapeCard();
    this.scopeToProfile();
    this.applySettingsToChrome();
    this.refresh();
    window.dispatchEvent(new Event('scout-profiles-changed'));
  }

  /**
   * Explorer <-> Together, any time. Going to Together relaxes the locks and
   * shows exact places, so it asks for a grown-up; going back to Explorer does not.
   */
  private async toggleMode(): Promise<void> {
    const toTogether = this.profile.mode === 'explorer';
    if (toTogether && !(await askGrownUp('Exploring together is for when a grown-up is beside you.'))) return;
    const p: Profile = { ...this.profile, mode: toTogether ? 'together' : 'explorer' };
    await this.profileHost().save(p);
    sounds.pick();
    toast(toTogether ? '👨‍👧 Exploring together with a grown-up' : '🧒 Exploring on my own');
    say(toTogether ? 'Exploring together! Stay with your grown-up.' : 'Exploring on my own!');
  }

  private applyAudio(): void {
    setReadAloud(this.settings.readAloud);
    setSounds(this.settings.sounds);
    setVoice(this.settings.voiceURI);
    setVoiceMode(this.settings.voiceMode);
  }


  // ── Which way am I facing? ────────────────────────────────────

  /** Turns the facing arrow on or off. On iPhones and iPads the compass asks permission, so this must run from a tap. */
  private async toggleCompass(): Promise<void> {
    sounds.tap();
    if (this.settings.compass) {
      this.stopCompass();
      this.settings = { ...this.settings, compass: false };
      await saveSettings(this.settings);
      say('Arrow off.');
      toast('🧭 Arrow off');
      return;
    }
    if (!(await this.startCompass())) {
      say('This device will not share its compass.');
      toast('🧭 No compass here. A grown-up can allow motion and orientation in the settings.');
      return;
    }
    this.settings = { ...this.settings, compass: true };
    await saveSettings(this.settings);
    say('Now the arrow shows which way you are facing! Turn around and watch it.');
    toast('🧭 The arrow shows which way you face');
    // A laptop has no compass but still says yes: tell the explorer rather than show nothing.
    setTimeout(() => {
      if (this.settings.compass && this.compass.running && !this.compass.hasReading) toast('🧭 Hmm, this device does not seem to have a compass.');
    }, 3500);
  }

  private async startCompass(): Promise<boolean> {
    this.compass.onHeading = deg => {
      this.facingDeg = smoothHeading(this.facingDeg, deg);
      this.map.setFacing(this.facingDeg);
    };
    return this.compass.start();
  }

  private stopCompass(): void {
    this.compass.stop();
    this.facingDeg = null;
    this.map.setFacing(null);
  }

  /**
   * At launch. Where the compass asks permission (iOS) it can only be asked from a tap, so a
   * remembered "on" waits for the explorer's first touch anywhere — Field Mapper keeps it armed
   * until the next tap of its button; here any tap will do.
   */
  private resumeCompass(): void {
    if (!this.settings.compass) return;
    if (!Compass.needsPermission()) { void this.startCompass(); return; }
    const once = () => { void this.startCompass(); };
    document.addEventListener('pointerup', once, { once: true });
  }

  /**
   * The 📍 Me button is Field Mapper's Locate and Follow in one (`#btn-locate` + `#btn-follow`), because a child's
   * screen has room for few buttons: a tap goes to the explorer AND keeps the map on them as they walk; a tap while
   * following, or dragging the map away (the departure from Field Mapper, whose map fights a pan back to the GPS
   * position — a child panning to look around reads that as the map being broken), stops it.
   */
  private async meTap(): Promise<void> {
    if (this.settings.follow) {
      sounds.tap();
      await this.setFollow(false);
      say('OK, the map stays put.');
      toast('📍 Not following you');
      return;
    }
    await this.setFollow(true);
    say('I will keep the map on you.');
    toast('📍 Following you');
    await this.findMe();
  }

  /** The 🗺️ Map card: map style, plus the switches set once and left (facing arrow, keep the screen on). */
  private openMapCard(): void {
    sounds.tap();
    openMapSheet(this.settings.basemap, async b => {
      this.settings = { ...this.settings, basemap: b };
      this.map.setBasemap(b);
      await saveSettings(this.settings);
    }, [
      {
        emoji: '🧭', label: 'Facing arrow',
        text: () => this.settings.compass && this.facingDeg != null ? `You are facing ${compassWord(this.facingDeg)}` : 'Shows which way you are facing',
        on: () => this.settings.compass, toggle: () => this.toggleCompass(),
      },
      {
        emoji: '💡', label: 'Keep the screen on',
        text: () => wakeLockSupported() ? 'Uses more battery' : 'This device cannot',
        on: () => this.settings.wakeLock, toggle: () => this.toggleWakeLock(),
      },
    ]);
  }

  private async setFollow(on: boolean): Promise<void> {
    if (this.settings.follow === on) return;
    this.settings = { ...this.settings, follow: on };
    this.paintFollow();
    await saveSettings(this.settings);
  }

  /**
   * The screen stays on while the 💡 switch is on, or while a path records and the grown-ups left "keep the
   * screen on while a path records" ticked. One holder (wakeLock.ts), as Field Mapper's `toggleWakeLock` learned.
   */
  private applyWakeLock(): void {
    setKeepAwake(this.settings.wakeLock || (this.recorder.recording && this.settings.keepAwake));
  }

  /** Field Mapper's Wake Lock button (`#btn-wakelock`), the same switch as the grown-up corner's. */
  private async toggleWakeLock(): Promise<void> {
    sounds.tap();
    if (!wakeLockSupported()) {
      say('This device cannot keep the screen on.');
      toast('💡 This device cannot keep the screen on.');
      return;
    }
    this.settings = { ...this.settings, wakeLock: !this.settings.wakeLock };
    await saveSettings(this.settings);
    this.applyWakeLock();
    if (this.settings.wakeLock) {
      say('The screen will stay on. It uses more battery.');
      toast('💡 Screen stays on');
    } else {
      say('OK, the screen can sleep.');
      toast('💡 Screen can sleep');
    }
  }

  private paintFollow(): void {
    const on = this.settings.follow;
    this.meBtn.classList.toggle('on', on);
    this.meBtn.setAttribute('aria-pressed', String(on));
    this.meBtn.setAttribute('aria-label', on ? 'Following me. Tap to stop' : 'Where am I? Tap to find me and follow me');
    railWord(this.meBtn, on ? 'Following' : 'Me');
  }


  // ── Recording a path ──────────────────────────────────────────

  private async toggleRecording(): Promise<void> {
    if (this.recorder.recording) {
      const w = await this.recorder.stop();
      clearInterval(this.recTimer);
      this.paintRecording();
      if (w) {
        this.upsertWalk(w);
        finishWalk(this.walkHost(), w);
      }
      return;
    }
    if (!lastFix()) say('I am still looking for where you are. I will start the path as soon as I find you.');
    await this.recorder.start(this.profile.id);
    sounds.pick();
    say("Recording your path! Tap Stop when you're done.");
    this.recTimer = window.setInterval(() => this.paintRecording(), 15000);
    this.paintRecording();
  }

  private paintRecording(): void {
    const w = this.recorder.walk;
    const on = this.recorder.recording;
    this.recBtn.classList.toggle('recording', on);
    railLabel(this.recBtn, on ? '⏹️' : '👣', on ? 'Stop' : 'Path');
    this.recBtn.setAttribute('aria-label', on ? 'Stop recording my path' : 'Record my path');
    this.recChip.hidden = !on;
    if (on && w) this.recChip.textContent = `⏺ ${distanceWords(walkLengthM(w.points))} · ${durationWords(walkDurationMs(w))}`;
    this.drawWalks();
  }

  private drawWalks(): void {
    const line = (pts: WalkPoint[]) => pts.map(p => [p.lon, p.lat] as [number, number]);
    // Broken where the GPS went quiet, never bridged with a straight line (segmentsAtGaps).
    const saved = this.settings.walksOnMap ? this.walks.filter(w => w.endedAt).flatMap(w => segmentsAtGaps(w.points).map(line)) : [];
    const live = this.recorder.recording && this.recorder.walk ? segmentsAtGaps(this.recorder.walk.points).map(line) : null;
    this.map.setWalks(saved, live);
  }

  private upsertWalk(w: Walk): void {
    this.everyWalk = [w, ...this.everyWalk.filter(x => x.id !== w.id)];
    this.scopeToProfile();
  }

  /** `without` leaves one path out: what the badges were before it was kept. */
  private badgeExtras(without?: string): BadgeExtras {
    const done = this.walks.filter(w => w.endedAt && w.id !== without);
    return {
      huntsCompleted: this.huntsDone(),
      tickChecks: this.tickCount(),
      walks: done.length,
      longestWalkM: Math.max(0, ...done.map(w => walkLengthM(w.points))),
    };
  }

  private walkHost(): WalkHost {
    return {
      profile: this.profile,
      walks: () => this.walks,
      save: async w => {
        const before = this.badgeExtras(w.id);
        await saveWalk(w);
        this.upsertWalk(w);
        this.drawWalks();
        for (const b of newlyEarned([], [], undefined, before, this.badgeExtras())) {
          setTimeout(() => { sounds.badge(); toast(`${b.emoji} New badge: ${b.title}!`, 4000); say(`You earned the ${b.title} badge!`); }, 1200);
        }
      },
      remove: async w => {
        await deleteWalk(w.id);
        this.everyWalk = this.everyWalk.filter(x => x.id !== w.id);
        this.scopeToProfile();
        this.drawWalks();
      },
      show: w => {
        this.drawWalks();
        this.map.fitLine(w.points.map(p => [p.lon, p.lat] as [number, number]));
      },
    };
  }

  private buildChrome(): void {
    const app = document.getElementById('app')!;
    this.hello = h('button', { class: 'hello', 'aria-label': "Who's exploring?", onclick: () => { say(this.helloText()); openProfiles(this.profileHost()); } });
    this.starBtn = h('button', { class: 'pill star', 'aria-label': "Today's challenges", onclick: () => openChallenges(this.screenHost()) });
    this.gpsNote = h('div', { class: 'gps-note', hidden: true });
    this.walkNote = h('div', { class: 'walk-note', hidden: true });
    this.huntChip = h('button', { class: 'pill hunt-pill', hidden: true, onclick: () => this.openHuntsScreen() });
    this.dock = new BuddyDock(this.profile.guide, () => {
      const run = activeRun(this.runs);
      if (run && Math.random() < 0.5) {
        const next = openItems(run, this.liveIds())[0];
        if (next) return { text: `Hunt time! Can you find ${next.text.toLowerCase()}?`, pose: 'point' };
      }
      return tip(this.profile.guide);
    });
    const lock = h('button', { class: 'round-btn lock', 'aria-label': 'Grown-up corner', onclick: () => void this.openGrownUpCorner() }, '🔒');
    const act: Record<ToolId, () => void> = {
      me: () => void this.meTap(),
      map: () => this.openMapCard(),
      draw: () => this.toggleDraw('sketch'),
      measure: () => this.toggleDraw('measure'),
      path: () => void this.toggleRecording(),
      hunts: () => this.openHuntsScreen(),
      done: () => void this.endAdventure(),
    };
    for (const t of TOOLS) this.toolBtns.set(t.id, railButton(t.emoji, t.word, t.what, act[t.id], `${t.id}-btn`));
    this.recBtn = this.toolBtns.get('path')!;
    this.recChip = h('button', { class: 'rec-chip', hidden: true, 'aria-label': 'Recording my path. Tap to stop', onclick: () => void this.toggleRecording() });
    this.recorder.onChange = () => { this.paintRecording(); this.applyWakeLock(); };
    this.meBtn = this.toolBtns.get('me')!;
    this.quickRow = h('div', { class: 'quick-row', role: 'group', 'aria-label': 'Quick finds: take a photo and save' });
    window.addEventListener('resize', () => fitQuickWords(this.quickRow));
    app.append(
      h('div', { id: 'map' }),
      h('header', { class: 'top-bar' }, this.hello, this.starBtn, this.huntChip, lock),
      this.recChip,
      // Each button with its word, as Field Mapper's rail labels every button (`tool-btn-label`); which buttons,
      // and in what order, is the explorer's own (railTools.ts, "My buttons").
      this.sideRail(),
      this.dock.el,
      this.gpsNote,
      this.walkNote,
      this.quickRow,
      h('nav', { class: 'bottom-bar' },
        h('button', { class: 'nav-btn', onclick: () => openBook(this.screenHost()) }, h('span', { class: 'nav-emoji' }, '📖'), 'My Finds'),
        h('button', { class: 'found-btn', onclick: () => void this.capture() }, h('span', { class: 'found-emoji' }, '✨'), h('span', {}, 'I found something!')),
        h('button', { class: 'nav-btn', onclick: () => openBadges(this.screenHost()) }, h('span', { class: 'nav-emoji' }, '🏅'), 'Badges'),
      ),
    );
    this.applySettingsToChrome();
    this.applyAudio();
    this.paintFollow();
    this.applyWakeLock();
    this.resumeCompass();
  }

  /**
   * 📍: straight to the last known spot (where the avatar is), then a fresh position from the phone, which
   * moves the map again only if it is somewhere else.
   */
  private async findMe(): Promise<void> {
    sounds.tap();
    const known = knownFix();
    if (known) { this.map.goToMe(known); say('Here you are!'); }
    else say('Looking for you…');
    const fresh = await refreshFix(known ? 8000 : 15000);
    if (fresh) {
      this.map.showMe(fresh);
      if (!known || Math.hypot(fresh.lat - known.lat, (fresh.lon - known.lon) * Math.cos(fresh.lat * Math.PI / 180)) * 111_000 > 15) {
        this.map.goToMe(fresh);
        if (!known) say('Here you are!');
      }
    } else if (!known) {
      const why = fixProblem();
      say(why ?? 'I cannot find you yet. Try again outside, away from tall buildings.');
      toast(`📍 ${why ?? 'Still looking for where you are'}`);
    }
  }

  /**
   * The map buttons down the right edge, folding away behind one caret like Field Mapper's right rail
   * (#btn-collapse-right): more map when they are not needed. Remembered on this device (`scout.rail`).
   */
  private sideRail(): HTMLElement {
    const KEY = 'scout.rail.collapsed';
    let folded = false;
    try { folded = localStorage.getItem(KEY) === '1'; } catch { /* private mode: start open */ }
    const body = h('div', { class: 'side-body', id: 'side-body' });
    this.railBody = body;
    const toggle = h('button', { class: 'round-btn rail-toggle', 'aria-controls': 'side-body' });
    // Field Mapper's fold caret, drawn in Scout's own inked line (icons.ts).
    toggle.append(icon('up'));
    const rail = h('div', { class: 'side-btns' }, toggle, body);
    const paint = () => {
      rail.classList.toggle('folded', folded);
      toggle.setAttribute('aria-expanded', String(!folded));
      toggle.setAttribute('aria-label', folded ? 'Show the map buttons' : 'Hide the map buttons');
    };
    toggle.addEventListener('click', () => {
      folded = !folded;
      try { localStorage.setItem(KEY, folded ? '1' : '0'); } catch { /* not remembered: fine */ }
      sounds.tap();
      paint();
    });
    paint();
    return rail;
  }

  /** The explorer's own buttons, in their order (absent: their tier's). Path also needs the grown-ups' switch. */
  private paintRail(): void {
    if (!this.railBody) return;
    const ids = railFor(this.profile.tools, tierOf(this.profile.tier).id)
      .filter(id => id !== 'path' || this.settings.pathRecording || this.recorder.recording);
    this.railBody.replaceChildren(...ids.map(id => this.toolBtns.get(id)!));
    this.railBody.dataset.count = String(ids.length);
    if (this.drawing && !ids.includes(this.drawing === 'sketch' ? 'draw' : 'measure')) closeDrawTool();
  }

  /** ✏️ Draw and 📏 Measure: one at a time; tapping the lit button again puts it away. */
  private toggleDraw(mode: DrawMode): void {
    sounds.tap();
    if (this.drawing === mode) { closeDrawTool(); return; }
    this.openDraw(mode);
  }

  /** Opens ✏️ Draw or 📏 Measure; `editing` opens Draw on a saved drawing, from its card. */
  private openDraw(mode: DrawMode, editing?: Sketch): void {
    closeShapeCard();
    closeDrawTool();
    this.drawing = mode;
    this.editingSketchId = editing?.id ?? null;
    this.paintDrawBtns();
    this.paintSketches();
    openDrawTool(this.drawHost(), mode, () => {
      if (this.drawing === mode) this.drawing = null;
      this.editingSketchId = null;
      this.paintSketches();
      this.paintDrawBtns();
    }, editing);
  }

  private drawHost(): DrawHost {
    return {
      map: this.map,
      profile: this.profile,
      sketches: () => this.sketches,
      save: sk => this.saveSketch(sk),
      remove: sk => this.removeSketch(sk),
    };
  }

  /** Saves a new drawing, or a changed one in its place. */
  private async saveSketch(sk: Sketch): Promise<void> {
    await saveSketch(sk);
    const at = this.everySketch.findIndex(x => x.id === sk.id);
    if (at >= 0) this.everySketch[at] = sk; else this.everySketch.unshift(sk);
    this.scopeToProfile();
    this.paintSketches();
  }

  private async removeSketch(sk: Sketch): Promise<void> {
    await deleteSketch(sk.id);
    this.everySketch = this.everySketch.filter(x => x.id !== sk.id);
    this.scopeToProfile();
    this.paintSketches();
  }

  /** The drawings on the map: every one of this explorer's, less the one being changed (drawn as the draft). */
  private paintSketches(): void {
    this.map.setSketches(this.editingSketchId ? this.sketches.filter(s => s.id !== this.editingSketchId) : this.sketches);
  }

  /**
   * A tap on the map with no tool on: the drawing or saved path under it opens its card (shapeCard.ts), as Field
   * Mapper's Identify answers a tap; a tap on empty map closes the card. Only what is drawn takes part — saved
   * paths only while they are shown, never the path recording now.
   */
  private tapShape(at: { lat: number; lon: number }): void {
    if (document.body.classList.contains('picking') || document.querySelector('.sheet')) return;
    const walks = this.settings.walksOnMap ? this.walks.filter(w => w.endedAt) : [];
    const picked = pickShape(this.sketches, walks, at.lon, at.lat, SHAPE_TAP_PX * metresPerPixel(at.lat, this.map.zoom()));
    if (!picked) { closeShapeCard(); return; }
    const walkHost = this.walkHost();
    openShapeCard({
      map: this.map,
      profile: this.profile,
      saveSketch: sk => this.saveSketch(sk),
      removeSketch: sk => this.removeSketch(sk),
      saveWalk: w => walkHost.save(w),
      removeWalk: w => walkHost.remove(w),
      editSketch: sk => this.openDraw('sketch', sk),
    }, picked);
  }

  private paintDrawBtns(): void {
    for (const [id, mode] of [['draw', 'sketch'], ['measure', 'measure']] as const) {
      const b = this.toolBtns.get(id);
      b?.classList.toggle('on', this.drawing === mode);
      b?.setAttribute('aria-pressed', String(this.drawing === mode));
    }
  }

  private helloText(): string {
    const n = this.finds.length;
    const who = this.profile.name || 'Explorer';
    return n ? `Hi ${who}! You have found ${n} ${n === 1 ? 'thing' : 'things'}.` : `Hi ${who}! Let's go exploring!`;
  }

  private applySettingsToChrome(): void {
    document.documentElement.dataset.mode = this.profile.mode;
    // Read by later phases (docs/AGE_TIERS.md); nothing is styled by it yet.
    document.documentElement.dataset.tier = tierOf(this.profile.tier).id;
    applyLook(this.profile.look);
    const together = this.profile.mode === 'together';
    // The mode shows on the explorer's own chip (it switches in "Who's exploring?", one tap away), so the map
    // keeps its room for the buttons used on the move.
    this.hello.replaceChildren(profileFace(this.profile, 'face hello-face'), h('span', { class: 'hello-name' }, this.profile.name || 'Explorer'),
      h('span', { class: 'hello-mode', title: together ? 'Exploring together' : 'Exploring on my own' }, together ? '👨‍👧' : '🧒'));
    this.hello.setAttribute('aria-label', `Who's exploring? ${this.profile.name || 'Explorer'}, ${together ? 'exploring together' : 'exploring on my own'}`);
    this.map.setAvatar?.(this.mapFace());
    this.dock?.setGuide(this.profile.guide);
    setNarrator(this.profile.guide);
    this.paintRail();
    this.paintStar();
    this.paintHunt();
    if (this.recBtn) this.paintRecording();
    this.paintQuick();
  }

  /** The explorer on the map: their own map avatar, else their card picture (avatarArt.mapPicture). */
  private mapFace(): Face {
    const pic = mapPicture(this.profile);
    if (pic.kind === 'photo') return { emoji: this.profile.avatar, photo: this.profile.photo };
    if (pic.kind === 'art') return { emoji: this.profile.avatar, art: artUrl(pic.art) };
    return { emoji: pic.emoji };
  }

  private liveIds(): Set<string> {
    return new Set(this.finds.map(f => f.id));
  }

  private paintHunt(): void {
    const run = activeRun(this.runs);
    if (!this.huntChip) return;
    this.huntChip.hidden = !run;
    if (!run) return;
    const p = huntProgress(run, this.liveIds());
    this.huntChip.textContent = `${run.hunt.emoji} ${p.done}/${p.total}`;
    this.huntChip.setAttribute('aria-label', `${run.hunt.title}: ${p.done} of ${p.total} found`);
  }

  private paintStar(): void {
    const { list, done } = todaysChallenges(this.finds);
    this.starBtn.textContent = `⭐ ${done.size}/${list.length}`;
    this.starBtn.classList.toggle('all-done', done.size === list.length);
  }

  private paintWalk(m: number): void {
    if (!this.settings.trail || m < 50) { this.walkNote.hidden = true; return; }
    this.walkNote.hidden = false;
    this.walkNote.textContent = `👣 ${m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`} today`;
  }

  private startLocation(): void {
    onFix(async (fix, error) => {
      if (!fix) {
        this.gpsNote.hidden = !error;
        this.gpsNote.textContent = `📍 ${error ?? ''}`;
        return;
      }
      this.gpsNote.hidden = true;
      this.map.showMe(fix);
      // Not while a spot is being picked: the target sits at the map's centre, and following would move it.
      if (this.settings.follow && !document.body.classList.contains('picking')) this.map.follow(fix);
      if (this.settings.trail && (await addToTrail(fix))) {
        const t = await loadToday();
        this.map.setTrail(t.points, true);
        this.paintWalk(trailLengthM(t));
      }
    });
    startGps();
  }

  private async capture(existing?: Find, at?: { lat: number; lon: number }): Promise<void> {
    sounds.tap();
    closeShapeCard();
    // Changing a find works on its pictures too, which are read only now (Field Mapper's getFeature, hydrated).
    const full = existing ? await getFullFind(existing.id) : undefined;
    if (existing && !full) return;
    startCapture({
      settings: this.settings,
      profile: this.profile,
      hunt: () => {
        const run = activeRun(this.runs);
        return run ? { title: run.hunt.title, emoji: run.hunt.emoji, open: openItems(run, this.liveIds()) } : null;
      },
      save: (f, items) => this.saveNew(f, items),
      update: f => this.updateFind(f),
      pickOnMap: start => pickOnMap(this.map, start),
    }, full, at);
  }

  private tickCount(): number {
    return this.profile.tickChecks?.length ?? 0;
  }

  /** "Done exploring": what today held, then the tick check. */
  private async endAdventure(): Promise<void> {
    sounds.tap();
    const today = localDay(new Date().toISOString());
    const n = this.finds.filter(f => localDay(f.createdAt) === today).length;
    const t = await loadToday();
    const m = this.settings.trail ? trailLengthM(t) : 0;
    const walked = m >= 50 ? ` and walked ${m < 1000 ? `${Math.round(m / 10) * 10} metres` : `${(m / 1000).toFixed(1)} kilometres`}` : '';
    const summary = n ? `What an adventure! Today you found ${n} ${n === 1 ? 'thing' : 'things'}${walked}.` : walked ? `What an adventure! Today you${walked.replace(' and', '')}.` : '';
    this.openTickCheckScreen(summary);
  }

  private openTickCheckScreen(summary?: string): void {
    openTickCheck({
      settings: this.settings,
      done: async () => {
        const before = this.tickCount();
        this.profile = await saveProfile({ ...this.profile, tickChecks: recordCheck(this.profile.tickChecks, new Date().toISOString()) });
        this.profiles = this.profiles.map(p => (p.id === this.profile.id ? this.profile : p));
        const earned = newlyEarned([], [], undefined, { tickChecks: before }, { tickChecks: this.tickCount() });
        for (const b of earned) {
          setTimeout(() => { sounds.badge(); toast(`${b.emoji} New badge: ${b.title}!`, 4000); say(`You earned the ${b.title} badge!`); }, 1800);
        }
      },
    }, summary);
  }

  private huntsDone(): number {
    return this.runs.filter(r => r.status === 'done').length;
  }

  private async saveNew(full: FullFind, huntItems: string[]): Promise<void> {
    const before = this.finds.map(toBadgeFind);
    const huntsBefore = this.huntsDone();
    const challengesBefore = todaysChallenges(this.finds).done;
    const f = await saveFind(full);
    this.everyFind.unshift(f);
    this.finds.unshift(f);

    let news = null;
    const run = activeRun(this.runs);
    if (run && huntItems.length) {
      // The capture screen pre-ticks what the find meets; what the explorer left ticked is the answer.
      const next = tick(run, huntItems, f.id, this.liveIds(), new Date().toISOString());
      await saveHuntRun(next);
      this.replaceRun(next);
      news = { run: next, ticked: run.hunt.items.filter(i => huntItems.includes(i.id)), completed: next.status === 'done' };
    }

    const earned = newlyEarned(before, this.finds.map(toBadgeFind), undefined, { ...this.badgeExtras(), huntsCompleted: huntsBefore }, this.badgeExtras());
    const { list, done } = todaysChallenges(this.finds);
    const newly = list.filter(c => done.has(c.id) && !challengesBefore.has(c.id));
    this.map.setFinds(this.finds);
    this.paintStar();
    this.paintHunt();
    this.paintQuick();
    celebrate(this.screenHost(), f, earned, newly, typeof f.lat === 'number', news);
  }

  private async updateFind(full: FullFind): Promise<void> {
    this.replaceFind(await saveFind(full));
  }

  /** A change to a find's details only (the favourite star): its pictures stay as they are. */
  private async updateFindInfo(f: Find): Promise<void> {
    this.replaceFind(await saveFindInfo(f));
  }

  private replaceFind(f: Find): void {
    this.everyFind = this.everyFind.map(x => (x.id === f.id ? f : x));
    this.scopeToProfile();
    this.refresh();
  }

  private replaceRun(next: HuntRun): void {
    this.everyRun = this.everyRun.some(r => r.id === next.id) ? this.everyRun.map(r => (r.id === next.id ? next : r)) : [...this.everyRun, next];
    this.scopeToProfile();
  }

  private huntHost(): HuntHost {
    return {
      settings: this.settings,
      profile: this.profile,
      runs: () => this.runs,
      customHunts: () => this.custom,
      liveFindIds: () => this.liveIds(),
      start: async hunt => {
        const run: HuntRun = { id: uid(), profileId: this.profile.id, hunt, startedAt: new Date().toISOString(), found: {}, status: 'active' };
        await saveHuntRun(run);
        this.replaceRun(run);
        this.paintHunt();
      },
      stop: async (run, switching) => {
        const next: HuntRun = { ...run, status: 'stopped', finishedAt: new Date().toISOString() };
        await saveHuntRun(next);
        this.replaceRun(next);
        this.paintHunt();
        // Stopping a hunt usually means heading home; switching to another does not.
        if (!switching && this.settings.tickReminder && (await askYesNo('Done exploring? Let\'s do a tick check!', '🕷️ Tick check', 'Not now'))) {
          this.openTickCheckScreen();
        }
      },
      saveCustom: async hunt => {
        await saveCustomHunt(hunt);
        this.custom = [hunt, ...this.custom.filter(x => x.id !== hunt.id)];
      },
      deleteCustom: async id => {
        await deleteCustomHunt(id);
        this.custom = this.custom.filter(x => x.id !== id);
      },
      startCapture: () => void this.capture(),
    };
  }

  private openHuntsScreen(): void {
    sounds.tap();
    openHunts(this.huntHost());
  }

  /**
   * Quick finds, ported from Field Mapper's Quick Entry bar (`ui/QuickEntryBar.ts`: labelled pills that capture in one
   * tap): a small row above "I found something!", for an explorer who turned it on in My buttons (`quickFor`: the
   * kinds they picked, or the kinds they find most). A tap
   * opens the camera; the photo is saved as a find of that kind at the steadied GPS fix taken at the tap, with
   * nothing else asked — the rest can be added from the sticker book. One row, so it costs the map one row.
   */
  private paintQuick(): void {
    if (!this.quickRow) return;
    const kinds = quickFor(this.profile.quick, this.finds);
    const on = kinds.length > 0;
    this.quickRow.hidden = !on;
    document.documentElement.classList.toggle('has-quick', on);
    if (!on) return;
    this.quickRow.replaceChildren(
      h('span', { class: 'quick-label', 'aria-hidden': 'true' }, '📸'),
      ...kinds.map(id => {
        const c = categoryOf(id);
        return h('button', { class: 'quick-chip', style: `--cat:${c.colour}`, 'aria-label': `Quick find: take a photo of a ${c.label.toLowerCase()}`, onclick: () => this.quickFind(id) },
          h('span', { class: 'quick-emoji', 'aria-hidden': 'true' }, c.emoji), h('span', { class: 'quick-word' }, c.short ?? c.label));
      }),
    );
    requestAnimationFrame(() => fitQuickWords(this.quickRow));
  }

  private quickFind(category: Find['category']): void {
    sounds.tap();
    // The place is where the explorer was when they tapped (steadied while the camera is open), not where they are
    // after framing the shot.
    const atTap = steadyNow();
    const settled = atTap?.unsettled ? steadiedFix() : Promise.resolve(atTap);
    // The camera must open from inside the tap, or a phone refuses it.
    const input = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return;
      try {
        const blob = await downscale(file, 1600);
        const fix = (await settled) ?? atTap;
        const full: FullFind = {
          id: uid(), profileId: this.profile.id, createdAt: new Date().toISOString(), category,
          colours: [], pictures: [{ id: uid(), kind: 'photo', blob }], voices: [],
          thumb: await downscale(blob, 240, 0.8).catch(() => undefined),
          ...(fix ? { lat: fix.lat, lon: fix.lon, accuracy: Math.round(fix.accuracy), placeBy: 'gps' as const } : {}),
        };
        // The hunt items it plainly meets count, as the capture screen would have ticked them.
        const run = activeRun(this.runs);
        const probe = toBadgeFind({ ...full, pictures: [{ id: '', kind: 'photo' }] } as unknown as Find);
        const items = run ? openItems(run, this.liveIds()).filter(i => meetsRule(i, probe)).map(i => i.id) : [];
        await this.saveNew(full, items);
      } catch {
        sounds.oops();
        toast('Oh no, that picture did not save. Try again?');
      }
    });
    document.body.append(input);
    input.click();
  }

  private refresh(): void {
    window.dispatchEvent(new Event(FINDS_CHANGED));
    this.paintQuick();
    this.map.clearFinds();
    this.map.setFinds(this.finds);
    this.paintSketches();
    if (this.recBtn) this.drawWalks();
    this.paintStar();
    this.paintHunt();
  }

  private screenHost(): ScreenHost {
    return {
      settings: this.settings,
      profile: this.profile,
      finds: () => this.finds,
      showOnMap: f => typeof f.lat === 'number' && this.map.flyTo(f.lat, f.lon!),
      remove: async f => {
        await deleteFind(f.id);
        this.everyFind = this.everyFind.filter(x => x.id !== f.id);
        this.scopeToProfile();
        this.refresh();
      },
      update: f => this.updateFindInfo(f),
      media: id => getFindMedia(id),
      editFind: f => void this.capture(f),
      startCapture: () => void this.capture(),
      openHunts: () => this.openHuntsScreen(),
      huntsCompleted: () => this.huntsDone(),
      tickChecks: () => this.tickCount(),
      badgeExtras: () => this.badgeExtras(),
      tickCheck: () => this.openTickCheckScreen(),
      openWalks: () => openWalks(this.walkHost()),
    };
  }

  private profileHost(): ProfileHost {
    return {
      profiles: () => this.profiles,
      active: () => this.profile,
      findCount: id => this.everyFind.filter(f => (f.profileId ?? this.profiles[0]?.id) === id).length,
      switchTo: id => this.switchTo(id),
      save: async p => {
        p = await saveProfile(p);
        this.profiles = this.profiles.some(x => x.id === p.id) ? this.profiles.map(x => (x.id === p.id ? p : x)) : [...this.profiles, p];
        if (p.id === this.profile.id) {
          this.profile = p;
          this.scopeToProfile();
          this.applySettingsToChrome();
        }
        window.dispatchEvent(new Event('scout-profiles-changed'));
        return p;
      },
      remove: async p => {
        await deleteProfile(p.id);
        this.profiles = this.profiles.filter(x => x.id !== p.id);
        this.everyFind = this.everyFind.filter(f => f.profileId !== p.id);
        this.everyRun = this.everyRun.filter(r => r.profileId !== p.id);
        this.everyWalk = this.everyWalk.filter(w => w.profileId !== p.id);
        this.everySketch = this.everySketch.filter(x => x.profileId !== p.id);
        if (this.profile.id === p.id && this.profiles[0]) await this.switchTo(this.profiles[0].id);
        else { this.scopeToProfile(); this.refresh(); }
      },
      openCrew: () => openCrew(this.screenHost()),
      toggleMode: () => this.toggleMode(),
      openLook: () => openLook(this.profile, p => this.profileHost().save(p)),
      openButtons: () => openMyButtons(this.profile, p => this.profileHost().save(p), () => quickKinds(this.finds, MAX_QUICK)),
      openHelp: () => openHelp(this.profile.guide),
    };
  }

  private async openGrownUpCorner(): Promise<void> {
    if (!(await askGrownUp('Settings, explorers, species lists, saving finds to a file and deleting them are in here.'))) return;
    openGrownUps({
      settings: this.settings,
      allFinds: () => this.everyFind,
      allWalks: () => this.everyWalk,
      allSketches: () => this.everySketch,
      profiles: this.profileHost(),
      applySettings: async s => {
        this.settings = s;
        await saveSettings(s);
        this.applyAudio();
        this.applyWakeLock();
        this.applySettingsToChrome();
        const t = await loadToday();
        this.map.setTrail(t.points, s.trail);
        this.paintWalk(s.trail ? trailLengthM(t) : 0);
        this.drawWalks();
      },
      deleteAll: async () => {
        await deleteAllFinds();
        this.everyFind = [];
        this.everyRun = [];
        this.everyWalk = [];
        this.scopeToProfile();
        this.refresh();
        this.map.setTrail([], false);
        this.paintWalk(0);
      },
    });
  }
}

/** A side-rail button: its picture and, under it, its word (Field Mapper's `tool-btn-label`). */
function railButton(emoji: string, word: string, label: string, onclick: () => void, cls = ''): HTMLElement {
  return h('button', { class: `round-btn rail-btn ${cls}`, 'aria-label': label, onclick },
    h('span', { class: 'rail-emoji', 'aria-hidden': 'true' }, emoji), h('span', { class: 'rail-word', 'aria-hidden': 'true' }, word));
}

function railLabel(btn: HTMLElement, emoji: string, word: string): void {
  btn.querySelector('.rail-emoji')!.textContent = emoji;
  railWord(btn, word);
}

function railWord(btn: HTMLElement, word: string): void {
  btn.querySelector('.rail-word')!.textContent = word;
}

/**
 * Quick-find words a size smaller, a step at a time down to 11 px, until each fits its chip: wide letters (Chunky,
 * Pixel's capitals) and a narrow phone would otherwise cut "Mushroom" short. The … is the last resort, not the first.
 */
function fitQuickWords(row: HTMLElement): void {
  const words = [...row.querySelectorAll<HTMLElement>('.quick-word')];
  words.forEach(w => { w.style.fontSize = ''; });
  if (row.hidden || !words.length) return;
  for (let size = 13; size >= 11; size--) {
    const over = words.filter(w => w.scrollWidth > w.clientWidth + 0.5);
    if (!over.length) return;
    over.forEach(w => { w.style.fontSize = `${size}px`; });
  }
}
