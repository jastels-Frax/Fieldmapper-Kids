import type { Critter } from './critters.ts';

/** The woodland crew: each looks after one part of the app. Pip or Hop stays the explorer's own buddy. */
export interface CastMember {
  id: Critter;
  name: string;
  species: string;
  role: string;
  /** Where in the app they appear. */
  home: string;
  intro: string;
}

export const CAST: Record<Critter, CastMember> = {
  fox: { id: 'fox', name: 'Fern', species: 'red fox', role: 'Hunt Guide', home: 'Scavenger hunts',
    intro: 'Hi, I am Fern the fox! I run the scavenger hunts. Foxes are great at finding things!' },
  moose: { id: 'moose', name: 'Maple', species: 'moose', role: 'Badge Keeper', home: 'Badges and trophies',
    intro: 'Hello, I am Maple the moose. I look after your badges and trophies. Earn them all!' },
  bear: { id: 'bear', name: 'Bramble', species: 'black bear', role: 'Safety Ranger', home: 'Tick checks and staying safe',
    intro: 'I am Bramble the bear, the safety ranger. I help you check for ticks and stay safe outside.' },
  owl: { id: 'owl', name: 'Hoot', species: 'barred owl', role: 'Fact Finder', home: 'Fun facts',
    intro: 'Hoo hoo! I am Hoot the owl. I know lots of facts about the things you find!' },
  squirrel: { id: 'squirrel', name: 'Acorn', species: 'red squirrel', role: 'Sticker Keeper', home: 'Your sticker book',
    intro: 'Hi hi hi! I am Acorn the squirrel. I keep every find safe in your sticker book, like my acorns!' },
  raccoon: { id: 'raccoon', name: 'Bandit', species: 'raccoon', role: 'Challenge Master', home: "Today's challenges",
    intro: 'Psst! I am Bandit the raccoon. I hide three new challenges for you every day!' },
};
