import type { Species } from './species.ts';

/**
 * Houseplants: plants grown indoors in pots, by the names they are sold and known by. public/species/ns.json is Nova
 * Scotia's wild species, so a 🪴 Houseplant find had no names to choose from (2.14). Pure data, tested
 * (test/builtIns.test.ts).
 *
 * Compiled for Scout from general knowledge, not taken from a published list (the sources a list would be checked
 * against could not be reached when it was made). A scientific name is given only where it is certain; a genus where
 * the name covers many species or cultivars (Peace Lily is Spathiphyllum); none where the plant has been moved between
 * genera and its sold name no longer matches one (African Violet, Calathea, Dragon Tree, Umbrella Plant). English Ivy
 * is left to the province's list, which has it growing wild. Ordered commonest first: the first `SET_WORDS.home.chips`
 * are the big buttons on the name step, the rest are found by typing or under ➕ More.
 */
type Row = [name: string, scientific: string, emoji?: string];

const ROWS: Row[] = [
  ['Spider Plant', 'Chlorophytum comosum'], ['Snake Plant', 'Dracaena trifasciata'], ['Pothos', 'Epipremnum aureum'],
  ['Peace Lily', 'Spathiphyllum'], ['Aloe Vera', 'Aloe vera'], ['Jade Plant', 'Crassula ovata'],
  ['Monstera', 'Monstera deliciosa'], ['Heartleaf Philodendron', 'Philodendron hederaceum'], ['Rubber Plant', 'Ficus elastica'],
  ['Christmas Cactus', 'Schlumbergera', '🌵'], ['ZZ Plant', 'Zamioculcas zamiifolia'], ['Boston Fern', 'Nephrolepis exaltata', '🌿'],
  ['African Violet', ''], ['Moth Orchid', 'Phalaenopsis'], ['Fiddle-leaf Fig', 'Ficus lyrata'],
  ['Money Tree', 'Pachira aquatica'], ['Chinese Money Plant', 'Pilea peperomioides'], ['Venus Flytrap', 'Dionaea muscipula'],
  ['Poinsettia', 'Euphorbia pulcherrima'], ['Lucky Bamboo', 'Dracaena sanderiana', '🎋'], ['Prayer Plant', 'Maranta leuconeura'],
  ['Air Plant', 'Tillandsia'], ['Parlour Palm', 'Chamaedorea elegans', '🌴'], ['Geranium', 'Pelargonium'],
  ['Weeping Fig', 'Ficus benjamina'], ['Chinese Evergreen', 'Aglaonema'], ['Dumb Cane', 'Dieffenbachia'],
  ['Cast-iron Plant', 'Aspidistra elatior'], ['Calathea', ''], ['Amaryllis', 'Hippeastrum'],
  ['Baby Rubber Plant', 'Peperomia obtusifolia'], ['Wax Plant', 'Hoya carnosa'], ['String of Pearls', 'Curio rowleyanus'],
  ["Burro's Tail", 'Sedum morganianum'], ['Echeveria', 'Echeveria'], ['Haworthia', 'Haworthia'],
  ['Ponytail Palm', 'Beaucarnea recurvata'], ['Areca Palm', 'Dypsis lutescens', '🌴'], ['Kentia Palm', 'Howea forsteriana', '🌴'],
  ['Dragon Tree', ''], ['Corn Plant', 'Dracaena fragrans'], ['Croton', 'Codiaeum variegatum'],
  ['Polka Dot Plant', 'Hypoestes phyllostachya'], ['Nerve Plant', 'Fittonia albivenis'], ['Arrowhead Plant', 'Syngonium podophyllum'],
  ['Umbrella Plant', ''], ['Aluminium Plant', 'Pilea cadierei'], ['Inch Plant', 'Tradescantia zebrina'],
  ['Purple Heart', 'Tradescantia pallida'], ['Tropical Pitcher Plant', 'Nepenthes'], ['Urn Plant', 'Aechmea fasciata'],
  ['Anthurium', 'Anthurium andraeanum'], ['Kalanchoe', 'Kalanchoe blossfeldiana'], ['Rex Begonia', 'Begonia rex'],
  ['Coleus', 'Coleus scutellarioides'], ['Cyclamen', 'Cyclamen persicum'], ['Chinese Hibiscus', 'Hibiscus rosa-sinensis', '🌺'],
  ['Bird of Paradise', 'Strelitzia reginae'], ['Elephant Ear', 'Alocasia'], ['Caladium', 'Caladium'],
  ["Bird's Nest Fern", 'Asplenium nidus', '🌿'], ['Staghorn Fern', 'Platycerium', '🌿'], ['Delta Maidenhair Fern', 'Adiantum raddianum', '🌿'],
  ['Asparagus Fern', 'Asparagus', '🌿'], ['Mother of Thousands', 'Kalanchoe daigremontiana'], ['Panda Plant', 'Kalanchoe tomentosa'],
  ['Zebra Plant', 'Aphelandra squarrosa'], ['Lipstick Plant', 'Aeschynanthus radicans'], ['String of Hearts', 'Ceropegia woodii'],
  ['Yucca', 'Yucca'], ['Bunny Ear Cactus', 'Opuntia microdasys', '🌵'], ['Moon Cactus', 'Gymnocalycium mihanovichii', '🌵'],
  ['Purple Shamrock', 'Oxalis triangularis', '☘️'], ['Swedish Ivy', 'Plectranthus verticillatus'], ['Grape Ivy', 'Cissus rhombifolia'],
  ['Norfolk Island Pine', 'Araucaria heterophylla'], ['Gardenia', 'Gardenia jasminoides'], ['Avocado', 'Persea americana', '🥑'],
  ['Sensitive Plant', 'Mimosa pudica'], ['Sago Palm', 'Cycas revoluta'], ['Crown of Thorns', 'Euphorbia milii'],
  ['Ti Plant', 'Cordyline fruticosa'], ['Living Stones', 'Lithops'], ['Satin Pothos', 'Scindapsus pictus'],
];

/**
 * Named varieties (2.17): the cultivars and close kin sold under their own names, like the Thai Constellation Monstera.
 * Each is named variety first, plant second ("Marble Queen Pothos"), so typing either word finds it, and its scientific
 * name is its parent's with the variety in quotes where the variety is a registered cultivar name. A trade name that is
 * not the cultivar name (Raven ZZ Plant) gets the species alone; a name whose classification is unsettled gets none.
 * After the plants above, so they are found by typing or under ➕ More.
 */
const VARIETIES: Row[] = [
  // Monstera and kin
  ['Thai Constellation Monstera', "Monstera deliciosa 'Thai Constellation'"], ['Albo Monstera', "Monstera deliciosa 'Albo Variegata'"],
  ['Swiss Cheese Vine', 'Monstera adansonii'], ['Mini Monstera', 'Rhaphidophora tetrasperma'],
  // Pothos
  ['Golden Pothos', 'Epipremnum aureum'], ['Marble Queen Pothos', "Epipremnum aureum 'Marble Queen'"],
  ['Neon Pothos', "Epipremnum aureum 'Neon'"], ['Manjula Pothos', "Epipremnum aureum 'Manjula'"],
  ['Pearls and Jade Pothos', "Epipremnum aureum 'Pearls and Jade'"], ['Cebu Blue Pothos', "Epipremnum pinnatum 'Cebu Blue'"],
  // Philodendron
  ['Pink Princess Philodendron', "Philodendron erubescens 'Pink Princess'"], ['Brasil Philodendron', "Philodendron hederaceum 'Brasil'"],
  ['Micans Philodendron', "Philodendron hederaceum 'Micans'"], ['Lemon Lime Philodendron', "Philodendron hederaceum 'Lemon Lime'"],
  ['Birkin Philodendron', "Philodendron 'Birkin'"], ['Prince of Orange Philodendron', "Philodendron 'Prince of Orange'"],
  // Snake plant
  ['Laurentii Snake Plant', "Dracaena trifasciata 'Laurentii'"], ["Bird's Nest Snake Plant", "Dracaena trifasciata 'Hahnii'"],
  ['Moonshine Snake Plant', "Dracaena trifasciata 'Moonshine'"], ['Cylindrical Snake Plant', 'Dracaena angolensis'],
  // Spider plant, peace lily, ZZ
  ['Variegated Spider Plant', "Chlorophytum comosum 'Variegatum'"], ['Bonnie Spider Plant', "Chlorophytum comosum 'Bonnie'"],
  ['Domino Peace Lily', "Spathiphyllum 'Domino'"], ['Raven ZZ Plant', 'Zamioculcas zamiifolia'],
  // Figs
  ['Burgundy Rubber Plant', "Ficus elastica 'Burgundy'"], ['Tineke Rubber Plant', "Ficus elastica 'Tineke'"],
  ['Bambino Fiddle-leaf Fig', "Ficus lyrata 'Bambino'"],
  // Prayer plants and calatheas (moved to Goeppertia, so no scientific name, as Calathea above)
  ['Red Prayer Plant', 'Maranta leuconeura var. erythroneura'], ['Lemon Lime Prayer Plant', "Maranta leuconeura 'Lemon Lime'"],
  ['Rattlesnake Plant', ''], ['Peacock Plant', ''], ['Medallion Calathea', ''],
  // Hoyas and strings
  ['Sweetheart Hoya', 'Hoya kerrii'], ['Krimson Queen Hoya', "Hoya carnosa 'Krimson Queen'"], ['Hindu Rope Hoya', "Hoya carnosa 'Compacta'"],
  ['String of Turtles', 'Peperomia prostrata'], ['String of Bananas', 'Curio radicans'], ['String of Dolphins', ''],
  // Peperomia, pilea
  ['Watermelon Peperomia', 'Peperomia argyreia'], ['Ripple Peperomia', 'Peperomia caperata'], ['Friendship Plant', 'Pilea involucrata'],
  // Begonias (2.18). A group of hybrids sold under one name (Angel Wing, Wax, Dragon Wing) gets the genus alone.
  ['Polka Dot Begonia', 'Begonia maculata'], ['Angel Wing Begonia', 'Begonia'], ['Ferox Begonia', 'Begonia ferox'],
  ['Iron Cross Begonia', 'Begonia masoniana'], ['Eyelash Begonia', 'Begonia bowerae'], ['Beefsteak Begonia', 'Begonia × erythrophylla'],
  ['Peacock Begonia', 'Begonia pavonina'], ['Listada Begonia', 'Begonia listada'], ['Palm-leaf Begonia', 'Begonia luxurians'],
  ['Escargot Begonia', "Begonia 'Escargot'"], ['Fireworks Begonia', "Begonia 'Fireworks'"], ['Gryphon Begonia', "Begonia 'Gryphon'"],
  ['Marmaduke Begonia', "Begonia 'Marmaduke'"], ['Wax Begonia', 'Begonia'], ['Dragon Wing Begonia', 'Begonia'],
  ['Tuberous Begonia', 'Begonia × tuberhybrida'],
  // Called a begonia, and not one: a saxifrage that sends out runners like a strawberry.
  ['Strawberry Begonia', 'Saxifraga stolonifera'],
  // Evergreens, canes and corn plants
  ['Silver Bay Chinese Evergreen', "Aglaonema 'Silver Bay'"], ['Camille Dumb Cane', "Dieffenbachia 'Camille'"],
  ['Janet Craig Corn Plant', "Dracaena fragrans 'Janet Craig'"], ['Lemon Lime Dracaena', "Dracaena fragrans 'Lemon Lime'"],
  // Elephant ears
  ['Polly Elephant Ear', "Alocasia 'Polly'"], ['Dragon Scale Elephant Ear', "Alocasia baginda 'Dragon Scale'"],
  // Succulents and cacti
  ['Gollum Jade', "Crassula ovata 'Gollum'"], ['Zebra Haworthia', 'Haworthiopsis attenuata'],
  ['Thanksgiving Cactus', 'Schlumbergera truncata', '🌵'],
  // Ferns
  ['Kimberly Queen Fern', 'Nephrolepis obliterata', '🌿'], ['Blue Star Fern', 'Phlebodium aureum', '🌿'],
];

export const HOUSEPLANTS: readonly Species[] = [...ROWS, ...VARIETIES].map(([n, s, e]) => ({
  n, t: 'Houseplant', x: true, o: 'home' as const, ...(s ? { s } : {}), ...(e ? { e } : {}),
}));
