import type { Find, Profile, Settings } from './types.ts';
import {
  allCustomHunts, allFinds, allHuntRuns, allProfiles, deleteAllFinds, deleteCustomHunt, deleteFind, deleteProfile,
  loadSettings, migrateToProfiles, saveCustomHunt, saveFind, saveHuntRun, saveProfile, saveSettings,
} from './storage.ts';
import { MapView } from './mapView.ts';
import { lastFix, onFix, startGps } from './gps.ts';
import { addToTrail, loadToday, trailLengthM } from './trail.ts';
import { askYesNo, h, toast, uid } from './ui.ts';
import { say, setReadAloud } from './speech.ts';
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
import { openBasemapPicker } from './basemapPicker.ts';

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

  async init(): Promise<void> {
    this.settings = await loadSettings();
    this.profiles = await migrateToProfiles();
    if (!this.profiles.length) this.profiles = await allProfiles();
    // Re-read: the migration rewrote the settings record.
    this.settings = await loadSettings();
    this.everyFind = await allFinds();
    this.everyRun = await allHuntRuns();
    this.custom = await allCustomHunts();
    this.applyAudio();
    const first = this.profiles.find(p => p.id === this.settings.activeProfileId) ?? this.profiles[0];
    this.profile = first ?? { id: '', name: '', avatar: '🦊', mode: 'explorer', guide: 'frog', createdAt: '' };
    this.scopeToProfile();
    this.buildChrome();
    await this.map.mount(document.getElementById('map')!, { emoji: this.profile.avatar, photo: this.profile.photo }, this.settings.basemap);
    this.map.onFindTap = id => openFind(this.screenHost(), id, () => this.refresh());
    this.map.setFinds(this.finds);
    if (!first) {
      const p = await welcome();
      await saveProfile(p);
      this.profiles = [p];
      await this.switchTo(p.id);
    }
    if (this.map.offline) toast('🌧️ No internet, so the map is plain today. Your finds still work!', 4500);
    this.startLocation();
    const t = await loadToday();
    this.map.setTrail(t.points, this.settings.trail);
    this.paintWalk(t.points.length ? trailLengthM(t) : 0);
    const hi = greet(this.profile.guide);
    this.dock.speak({ ...hi, text: this.profile.name ? `Hi ${this.profile.name}! ${hi.text}` : hi.text });
  }

  /** The finds and hunts on screen are the active explorer's (old records with no owner count as theirs). */
  private scopeToProfile(): void {
    const mine = (x: { profileId?: string }) => !x.profileId || x.profileId === this.profile.id;
    this.finds = this.everyFind.filter(mine);
    this.runs = this.everyRun.filter(mine);
    this.profile.guide = normalizeGuide(this.profile.guide);
    setGuideName(this.profile.guide, guideName(this.profile.guide, this.profile.guideName));
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

  private applyAudio(): void {
    setReadAloud(this.settings.readAloud);
    setSounds(this.settings.sounds);
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
    const me = h('button', { class: 'round-btn me-btn', 'aria-label': 'Where am I?', onclick: () => {
      if (this.map.goToMe(lastFix())) { sounds.tap(); say('Here you are!'); } else say('I am still looking for you.');
    } }, '📍');
    const layers = h('button', { class: 'round-btn', 'aria-label': 'Map style: streets, satellite or hybrid', onclick: () => openBasemapPicker(this.settings.basemap, async b => {
      this.settings = { ...this.settings, basemap: b };
      this.map.setBasemap(b);
      await saveSettings(this.settings);
    }) }, '🛰️');
    app.append(
      h('div', { id: 'map' }),
      h('header', { class: 'top-bar' }, this.hello, this.starBtn, this.huntChip, lock),
      h('div', { class: 'side-btns' }, me, layers,
        h('button', { class: 'round-btn', 'aria-label': 'Scavenger hunts', onclick: () => this.openHuntsScreen() }, '🔎'),
        h('button', { class: 'round-btn', 'aria-label': 'Done exploring: tick check', onclick: () => void this.endAdventure() }, '🏠')),
      this.dock.el,
      this.gpsNote,
      this.walkNote,
      h('nav', { class: 'bottom-bar' },
        h('button', { class: 'nav-btn', onclick: () => openBook(this.screenHost()) }, h('span', { class: 'nav-emoji' }, '📖'), 'My Finds'),
        h('button', { class: 'found-btn', onclick: () => this.capture() }, h('span', { class: 'found-emoji' }, '✨'), h('span', {}, 'I found something!')),
        h('button', { class: 'nav-btn', onclick: () => openBadges(this.screenHost()) }, h('span', { class: 'nav-emoji' }, '🏅'), 'Badges'),
      ),
    );
    this.applySettingsToChrome();
  }

  private helloText(): string {
    const n = this.finds.length;
    const who = this.profile.name || 'Explorer';
    return n ? `Hi ${who}! You have found ${n} ${n === 1 ? 'thing' : 'things'}.` : `Hi ${who}! Let's go exploring!`;
  }

  private applySettingsToChrome(): void {
    document.documentElement.dataset.mode = this.profile.mode;
    this.hello.replaceChildren(profileFace(this.profile, 'face hello-face'), h('span', { class: 'hello-name' }, this.profile.name || 'Explorer'));
    this.map.setAvatar?.({ emoji: this.profile.avatar, photo: this.profile.photo });
    this.dock?.setGuide(this.profile.guide);
    this.paintStar();
    this.paintHunt();
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
      if (this.settings.trail && (await addToTrail(fix))) {
        const t = await loadToday();
        this.map.setTrail(t.points, true);
        this.paintWalk(trailLengthM(t));
      }
    });
    startGps();
  }

  private capture(existing?: Find): void {
    sounds.tap();
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
    }, existing);
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
        this.profile = { ...this.profile, tickChecks: recordCheck(this.profile.tickChecks, new Date().toISOString()) };
        this.profiles = this.profiles.map(p => (p.id === this.profile.id ? this.profile : p));
        await saveProfile(this.profile);
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

  private async saveNew(f: Find, huntItems: string[]): Promise<void> {
    const before = this.finds.map(toBadgeFind);
    const huntsBefore = this.huntsDone();
    const challengesBefore = todaysChallenges(this.finds).done;
    await saveFind(f);
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

    const extras = (h: number) => ({ huntsCompleted: h, tickChecks: this.tickCount() });
    const earned = newlyEarned(before, this.finds.map(toBadgeFind), undefined, extras(huntsBefore), extras(this.huntsDone()));
    const { list, done } = todaysChallenges(this.finds);
    const newly = list.filter(c => done.has(c.id) && !challengesBefore.has(c.id));
    this.map.setFinds(this.finds);
    this.paintStar();
    this.paintHunt();
    celebrate(this.screenHost(), f, earned, newly, typeof f.lat === 'number', news);
  }

  private async updateFind(f: Find): Promise<void> {
    await saveFind(f);
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
      startCapture: () => this.capture(),
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
      update: f => this.updateFind(f),
      editFind: f => this.capture(f),
      startCapture: () => this.capture(),
      openHunts: () => this.openHuntsScreen(),
      huntsCompleted: () => this.huntsDone(),
      tickChecks: () => this.tickCount(),
      tickCheck: () => this.openTickCheckScreen(),
    };
  }

  private profileHost(): ProfileHost {
    return {
      profiles: () => this.profiles,
      active: () => this.profile,
      findCount: id => this.everyFind.filter(f => (f.profileId ?? this.profiles[0]?.id) === id).length,
      switchTo: id => this.switchTo(id),
      save: async p => {
        await saveProfile(p);
        this.profiles = this.profiles.some(x => x.id === p.id) ? this.profiles.map(x => (x.id === p.id ? p : x)) : [...this.profiles, p];
        if (p.id === this.profile.id) {
          this.profile = p;
          this.scopeToProfile();
          this.applySettingsToChrome();
        }
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
    };
  }

  private async openGrownUpCorner(): Promise<void> {
    if (!(await askGrownUp('Settings, explorers, species lists, saving finds to a file and deleting them are in here.'))) return;
    openGrownUps({
      settings: this.settings,
      allFinds: () => this.everyFind,
      profiles: this.profileHost(),
      applySettings: async s => {
        this.settings = s;
        await saveSettings(s);
        this.applyAudio();
        this.applySettingsToChrome();
        const t = await loadToday();
        this.map.setTrail(t.points, s.trail);
        this.paintWalk(s.trail ? trailLengthM(t) : 0);
      },
      deleteAll: async () => {
        await deleteAllFinds();
        this.everyFind = [];
        this.everyRun = [];
        this.scopeToProfile();
        this.refresh();
        this.map.setTrail([], false);
        this.paintWalk(0);
      },
    });
  }
}
