import type { Find, FullFind, Profile, Settings } from './types.ts';
import {
  allCustomHunts, allFinds, allHuntRuns, allProfiles, deleteAllFinds, deleteCustomHunt, deleteFind, deleteProfile,
  loadSettings, migrateToProfiles, saveCustomHunt, saveFind, saveHuntRun, saveProfile, saveSettings,
  allWalks, saveWalk, deleteWalk, getFullFind, getFindMedia, saveFindInfo,
} from './storage.ts';
import { PathRecorder } from './recorder.ts';
import { closeOrphan, distanceWords, durationWords, walkDurationMs, walkLengthM, type Walk } from './walk.ts';
import { finishWalk, openWalks, type WalkHost } from './walkScreens.ts';
import type { BadgeExtras } from './badges.ts';
import { MapView } from './mapView.ts';
import { fixProblem, knownFix, lastFix, onFix, refreshFix, startGps } from './gps.ts';
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
import { openMapSheet } from './basemapPicker.ts';
import { Compass } from './compass.ts';
import { setKeepAwake, wakeLockSupported } from './wakeLock.ts';
import { compassWord, smoothHeading } from './heading.ts';

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
  private soundBtn!: HTMLElement;
  private recBtn!: HTMLElement;
  private recChip!: HTMLElement;
  private recTimer: number | undefined;
  private recorder = new PathRecorder();
  private compass = new Compass();
  private meBtn!: HTMLElement;
  private facingDeg: number | null = null;
  private everyWalk: Walk[] = [];
  private walks: Walk[] = [];

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
    this.applyAudio();
    const first = this.profiles.find(p => p.id === this.settings.activeProfileId) ?? this.profiles[0];
    this.profile = first ?? { id: '', name: '', avatar: '🦊', mode: 'explorer', guide: 'frog', createdAt: '' };
    this.scopeToProfile();
    this.buildChrome();
    await this.map.mount(document.getElementById('map')!, { emoji: this.profile.avatar, photo: this.profile.photo }, this.settings.basemap);
    this.map.onFindTap = id => openFind(this.screenHost(), id, () => this.refresh());
    // Press and hold the map: a find already placed on that spot. Not while a spot is being picked for a find.
    this.map.onLongPress = at => {
      if (document.body.classList.contains('picking') || document.querySelector('.sheet')) return;
      say('Ooh, right here! What did you find?');
      void this.capture(undefined, at);
    };
    // Dragging the map to look around stops following (see meTap).
    this.map.onUserPan = () => { if (this.settings.follow) void this.setFollow(false); };
    this.map.setFinds(this.finds);
    if (!first) {
      const p = await saveProfile(await welcome());
      this.profiles = [p];
      await this.switchTo(p.id);
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
    this.scopeToProfile();
    this.applySettingsToChrome();
    this.refresh();
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
    if (this.soundBtn) {
      this.soundBtn.textContent = this.settings.readAloud ? '🔊' : '🔇';
      this.soundBtn.setAttribute('aria-label', this.settings.readAloud ? 'Reading aloud is on. Tap to turn it off' : 'Reading aloud is off. Tap to turn it on');
    }
  }

  /** The 🔊 / 🔇 button: reading aloud on and off, for anyone, any time. */
  private async toggleReadAloud(): Promise<void> {
    this.settings = { ...this.settings, readAloud: !this.settings.readAloud };
    await saveSettings(this.settings);
    this.applyAudio();
    sounds.tap();
    say('Reading aloud is on!');
    toast(this.settings.readAloud ? '🔊 Reading aloud is on' : '🔇 Reading aloud is off');
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
    const saved = this.settings.walksOnMap ? this.walks.filter(w => w.endedAt).map(w => w.points.map(p => [p.lon, p.lat] as [number, number])) : [];
    const live = this.recorder.recording && this.recorder.walk ? this.recorder.walk.points.map(p => [p.lon, p.lat] as [number, number]) : null;
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
    this.soundBtn = h('button', { class: 'round-btn lock sound-btn', onclick: () => void this.toggleReadAloud() });
    this.recBtn = railButton('👣', 'Path', 'Record my path', () => void this.toggleRecording(), 'rec-btn');
    this.recChip = h('button', { class: 'rec-chip', hidden: true, 'aria-label': 'Recording my path. Tap to stop', onclick: () => void this.toggleRecording() });
    this.recorder.onChange = () => { this.paintRecording(); this.applyWakeLock(); };
    this.meBtn = railButton('📍', 'Me', 'Where am I?', () => void this.meTap(), 'me-btn');
    const mapBtn = railButton('🗺️', 'Map', 'Map: how it looks, and map helpers', () => this.openMapCard());
    app.append(
      h('div', { id: 'map' }),
      h('header', { class: 'top-bar' }, this.hello, this.starBtn, this.huntChip, this.soundBtn, lock),
      this.recChip,
      // Five buttons, each with its word, as Field Mapper's rail labels every button (`tool-btn-label`).
      this.sideRail(this.meBtn, mapBtn, this.recBtn,
        railButton('🔎', 'Hunts', 'Scavenger hunts', () => this.openHuntsScreen()),
        railButton('🏠', 'Done', 'Done exploring: tick check', () => void this.endAdventure())),
      this.dock.el,
      this.gpsNote,
      this.walkNote,
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
  private sideRail(...buttons: HTMLElement[]): HTMLElement {
    const KEY = 'scout.rail.collapsed';
    let folded = false;
    try { folded = localStorage.getItem(KEY) === '1'; } catch { /* private mode: start open */ }
    const body = h('div', { class: 'side-body', id: 'side-body' }, ...buttons);
    const toggle = h('button', { class: 'round-btn rail-toggle', 'aria-controls': 'side-body' });
    // Field Mapper's caret (Phosphor caret-left), our own constant markup.
    toggle.innerHTML = '<svg viewBox="0 0 256 256" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"/></svg>';
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
    this.map.setAvatar?.({ emoji: this.profile.avatar, photo: this.profile.photo });
    this.dock?.setGuide(this.profile.guide);
    setNarrator(this.profile.guide);
    if (this.recBtn) this.recBtn.hidden = !this.settings.pathRecording && !this.recorder.recording;
    this.paintStar();
    this.paintHunt();
    if (this.recBtn) this.paintRecording();
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

  private refresh(): void {
    window.dispatchEvent(new Event(FINDS_CHANGED));
    this.map.clearFinds();
    this.map.setFinds(this.finds);
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
        return p;
      },
      remove: async p => {
        await deleteProfile(p.id);
        this.profiles = this.profiles.filter(x => x.id !== p.id);
        this.everyFind = this.everyFind.filter(f => f.profileId !== p.id);
        this.everyRun = this.everyRun.filter(r => r.profileId !== p.id);
        if (this.profile.id === p.id && this.profiles[0]) await this.switchTo(this.profiles[0].id);
        else { this.scopeToProfile(); this.refresh(); }
      },
      openCrew: () => openCrew(this.screenHost()),
      toggleMode: () => this.toggleMode(),
      openLook: () => openLook(this.profile, p => this.profileHost().save(p)),
    };
  }

  private async openGrownUpCorner(): Promise<void> {
    if (!(await askGrownUp('Settings, explorers, species lists, saving finds to a file and deleting them are in here.'))) return;
    openGrownUps({
      settings: this.settings,
      allFinds: () => this.everyFind,
      allWalks: () => this.everyWalk,
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

