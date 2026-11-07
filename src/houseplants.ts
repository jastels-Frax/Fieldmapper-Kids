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

export const HOUSEPLANTS: readonly Species[] = ROWS.map(([n, s, e]) => ({
  n, t: 'Houseplant', x: true, o: 'home' as const, ...(s ? { s } : {}), ...(e ? { e } : {}),
}));
