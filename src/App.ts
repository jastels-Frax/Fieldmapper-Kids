import type { Find, Settings } from './types.ts';
import {
  allCustomHunts, allFinds, allHuntRuns, deleteAllFinds, deleteCustomHunt, deleteFind, loadSettings,
  saveCustomHunt, saveFind, saveHuntRun, saveSettings,
} from './storage.ts';
import { MapView } from './mapView.ts';
import { lastFix, onFix, startGps } from './gps.ts';
import { addToTrail, loadToday, trailLengthM } from './trail.ts';
import { h, toast, uid } from './ui.ts';
import { say, setReadAloud } from './speech.ts';
import { setSounds, sounds } from './sound.ts';
import { startCapture } from './capture.ts';
import { celebrate, openBadges, openBook, openChallenges, openFind, todaysChallenges, type ScreenHost } from './screens.ts';
import { newlyEarned, toBadgeFind } from './badges.ts';
import { askGrownUp } from './gateView.ts';
import { openGrownUps } from './grownUps.ts';
import { welcome } from './welcome.ts';
import { BuddyDock } from './buddyView.ts';
import { greet, tip } from './buddyLines.ts';
import { huntProgress, openItems, tick, type Hunt, type HuntRun } from './hunts.ts';
import { activeRun, openHunts, type HuntHost } from './huntScreens.ts';

export class App {
  private settings!: Settings;
  private finds: Find[] = [];
  private map = new MapView();
  private hello!: HTMLElement;
  private starBtn!: HTMLElement;
  private gpsNote!: HTMLElement;
  private walkNote!: HTMLElement;
  private huntChip!: HTMLElement;
  private dock!: BuddyDock;
  private runs: HuntRun[] = [];
  private custom: Hunt[] = [];

  async init(): Promise<void> {
    this.settings = await loadSettings();
    this.finds = await allFinds();
    this.runs = await allHuntRuns();
    this.custom = await allCustomHunts();
    this.applyAudio();
    this.buildChrome();
    await this.map.mount(document.getElementById('map')!, this.settings.avatar);
    this.map.onFindTap = id => openFind(this.screenHost(), id, () => this.refresh());
    this.map.setFinds(this.finds);
    if (!this.settings.mode) {
      this.settings = await welcome(this.settings);
      await saveSettings(this.settings);
      this.applyAudio();
      this.applySettingsToChrome();
    }
    if (this.map.offline) toast('🌧️ No internet, so the map is plain today. Your finds still work!', 4500);
    this.startLocation();
    const t = await loadToday();
    this.map.setTrail(t.points, this.settings.trail);
    this.paintWalk(t.points.length ? trailLengthM(t) : 0);
    const hi = greet(this.settings.buddy);
    this.dock.speak({ ...hi, text: this.settings.name ? `Hi ${this.settings.name}! ${hi.text}` : hi.text });
  }

  private applyAudio(): void {
    setReadAloud(this.settings.readAloud);
    setSounds(this.settings.sounds);
  }

  private buildChrome(): void {
    const app = document.getElementById('app')!;
    this.hello = h('button', { class: 'hello', onclick: () => say(this.helloText()) });
    this.starBtn = h('button', { class: 'pill star', 'aria-label': "Today's challenges", onclick: () => openChallenges(this.screenHost()) });
    this.gpsNote = h('div', { class: 'gps-note', hidden: true });
    this.walkNote = h('div', { class: 'walk-note', hidden: true });
    this.huntChip = h('button', { class: 'pill hunt-pill', hidden: true, onclick: () => this.openHuntsScreen() });
    this.dock = new BuddyDock(this.settings.buddy, () => {
      const run = activeRun(this.runs);
      if (run && Math.random() < 0.5) {
        const next = openItems(run, this.liveIds())[0];
        if (next) return { text: `Hunt time! Can you find ${next.text.toLowerCase()}?`, pose: 'point' };
      }
      return tip(this.settings.buddy);
    });
    const lock = h('button', { class: 'round-btn lock', 'aria-label': 'Grown-up corner', onclick: () => void this.openGrownUpCorner() }, '🔒');
    const me = h('button', { class: 'round-btn me-btn', 'aria-label': 'Where am I?', onclick: () => {
      if (this.map.goToMe(lastFix())) { sounds.tap(); say('Here you are!'); } else say('I am still looking for you.');
    } }, '📍');
    app.append(
      h('div', { id: 'map' }),
      h('header', { class: 'top-bar' }, this.hello, this.starBtn, this.huntChip, lock),
      h('div', { class: 'side-btns' }, me,
        h('button', { class: 'round-btn', 'aria-label': 'Scavenger hunts', onclick: () => this.openHuntsScreen() }, '🔎')),
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
    const who = this.settings.name || 'Explorer';
    return n ? `Hi ${who}! You have found ${n} ${n === 1 ? 'thing' : 'things'}.` : `Hi ${who}! Let's go exploring!`;
  }

  private applySettingsToChrome(): void {
    document.documentElement.dataset.mode = this.settings.mode ?? 'explorer';
    this.hello.replaceChildren(h('span', { class: 'hello-face' }, this.settings.avatar), h('span', { class: 'hello-name' }, this.settings.name || 'Explorer'));
    this.map.setAvatar?.(this.settings.avatar);
    this.dock?.setBuddy(this.settings.buddy);
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

  private capture(): void {
    sounds.tap();
    startCapture({
      settings: this.settings,
      hunt: () => {
        const run = activeRun(this.runs);
        return run ? { title: run.hunt.title, emoji: run.hunt.emoji, open: openItems(run, this.liveIds()) } : null;
      },
      save: (f, items) => this.saveNew(f, items),
    });
  }

  private huntsDone(): number {
    return this.runs.filter(r => r.status === 'done').length;
  }

  private async saveNew(f: Find, huntItems: string[]): Promise<void> {
    const before = this.finds.map(toBadgeFind);
    const huntsBefore = this.huntsDone();
    const challengesBefore = todaysChallenges(this.finds).done;
    await saveFind(f);
    this.finds.unshift(f);

    let news = null;
    const run = activeRun(this.runs);
    if (run && huntItems.length) {
      // The capture screen pre-ticks what the find meets; what the explorer left ticked is the answer.
      const ids = huntItems;
      const next = tick(run, ids, f.id, this.liveIds(), new Date().toISOString());
      await saveHuntRun(next);
      this.runs = this.runs.map(r => (r.id === next.id ? next : r));
      news = { run: next, ticked: run.hunt.items.filter(i => ids.includes(i.id)), completed: next.status === 'done' };
    }

    const earned = newlyEarned(before, this.finds.map(toBadgeFind), undefined, { huntsCompleted: huntsBefore }, { huntsCompleted: this.huntsDone() });
    const { list, done } = todaysChallenges(this.finds);
    const newly = list.filter(c => done.has(c.id) && !challengesBefore.has(c.id));
    this.map.setFinds(this.finds);
    this.paintStar();
    this.paintHunt();
    celebrate(this.screenHost(), f, earned, newly, typeof f.lat === 'number', news);
  }

  private huntHost(): HuntHost {
    return {
      settings: this.settings,
      runs: () => this.runs,
      customHunts: () => this.custom,
      liveFindIds: () => this.liveIds(),
      start: async hunt => {
        const run: HuntRun = { id: uid(), hunt, startedAt: new Date().toISOString(), found: {}, status: 'active' };
        await saveHuntRun(run);
        this.runs.push(run);
        this.paintHunt();
      },
      stop: async run => {
        const next: HuntRun = { ...run, status: 'stopped', finishedAt: new Date().toISOString() };
        await saveHuntRun(next);
        this.runs = this.runs.map(r => (r.id === next.id ? next : r));
        this.paintHunt();
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
    this.map.clearFinds();
    this.map.setFinds(this.finds);
    this.paintStar();
    this.paintHunt();
  }

  private screenHost(): ScreenHost {
    return {
      settings: this.settings,
      finds: () => this.finds,
      showOnMap: f => typeof f.lat === 'number' && this.map.flyTo(f.lat, f.lon!),
      remove: async f => {
        await deleteFind(f.id);
        this.finds = this.finds.filter(x => x.id !== f.id);
        this.refresh();
      },
      update: async f => {
        await saveFind(f);
        this.refresh();
      },
      startCapture: () => this.capture(),
      openHunts: () => this.openHuntsScreen(),
      huntsCompleted: () => this.huntsDone(),
    };
  }

  private async openGrownUpCorner(): Promise<void> {
    if (!(await askGrownUp('Settings, saving finds to a file and deleting them are in here.'))) return;
    openGrownUps({
      settings: this.settings,
      finds: () => this.finds,
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
        this.finds = [];
        this.runs = [];
        this.refresh();
        this.map.setTrail([], false);
        this.paintWalk(0);
      },
    });
  }
}
