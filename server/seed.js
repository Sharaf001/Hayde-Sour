import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

function loadImage(filename) {
  return readFileSync(path.join(publicDir, filename));
}

const images = {
  hero: loadImage('tyre-hero.jpg'),
  cafe: loadImage('tyre-cafe.jpg'),
  souk: loadImage('tyre-souk.jpg'),
};

const listings = [
  { id: 'rest-1', name: 'Al Fanar', category: 'Restaurants', area: 'Al Mina · waterfront', description: 'Grilled fish, lemony salads and a front-row seat to the old harbour.', hours: '12:00 – 23:30', phone: '+961 7 740 171', rating: '4.8', price: '$$', image: images.cafe, tag: 'Local favourite' },
  { id: 'rest-2', name: 'Le Phenicien', category: 'Restaurants', area: 'Old City · sea wall', description: 'A generous Lebanese table with the sound of the waves just below.', hours: '11:00 – 22:30', phone: '+961 7 740 820', rating: '4.6', price: '$$', image: null, tag: 'Good for groups' },
  { id: 'cafe-1', name: 'Dar Alma', category: 'Cafes', area: 'Old City · Christian Quarter', description: 'Turkish coffee, rosewater cake and a tiled courtyard made for lingering.', hours: '08:30 – 20:00', phone: '+961 7 740 901', rating: '4.7', price: '$', image: images.souk, tag: 'Slow morning' },
  { id: 'cafe-2', name: 'Mina Social Club', category: 'Cafes', area: 'Al Mina · marina road', description: 'Bright coffee, cold lemonade and the best excuse to watch the boats come in.', hours: '07:30 – 22:00', phone: '+961 3 204 611', rating: '4.5', price: '$$', image: null, tag: 'Sea view' },
  { id: 'hotel-1', name: 'Dar Camelia', category: 'Hotels', area: 'Old City · near the ruins', description: 'A small guesthouse with limewashed rooms and an honest breakfast on the roof.', hours: 'Reception 08:00 – 22:00', phone: '+961 7 740 553', rating: '4.9', price: '$$$', image: images.hero, tag: 'Stay here' },
  { id: 'hotel-2', name: 'El Boutique', category: 'Hotels', area: 'Al Mina · 3 min to beach', description: 'Unfussy rooms, a shaded terrace and a team who knows every good sunset spot.', hours: 'Reception 24 hours', phone: '+961 7 740 333', rating: '4.4', price: '$$', image: null, tag: 'Easy check-in' },
  { id: 'pharm-1', name: 'Pharmacie Hajj', category: 'Pharmacies', area: 'Abbasieh Road · city centre', description: 'A well-stocked neighbourhood pharmacy with helpful, practical advice.', hours: '08:00 – 21:00', phone: '+961 7 740 445', rating: '4.6', price: 'Open late', image: null, tag: 'Open late' },
  { id: 'pharm-2', name: 'Pharmacie El Kassis', category: 'Pharmacies', area: 'Al Mina · near the taxi stand', description: 'Daily essentials, prescriptions and a quick stop before the beach.', hours: '09:00 – 20:00', phone: '+961 7 740 118', rating: '4.3', price: 'Neighbourhood', image: null, tag: 'Nearby' },
  { id: 'hospital-1', name: 'Hiram Hospital', category: 'Hospitals', area: 'Tyre · Nabih Berri Avenue', description: 'A full-service hospital with emergency care and specialist clinics.', hours: 'Emergency 24 hours', phone: '+961 7 740 444', rating: '4.2', price: 'Emergency 24h', image: null, tag: 'Emergency care' },
  { id: 'shop-1', name: 'Souk El Franj', category: 'Shops', area: 'Old City · souk quarter', description: 'Handmade baskets, soaps, linen and small things worth taking home.', hours: '09:00 – 19:30', phone: '+961 71 210 842', rating: '4.8', price: 'Local craft', image: images.souk, tag: 'Worth the detour' },
  { id: 'shop-2', name: 'Kanaan Market', category: 'Shops', area: 'Al Bass · main road', description: 'A bright, practical stop for pantry staples, beach bits and cold drinks.', hours: '07:00 – 22:00', phone: '+961 7 740 287', rating: '4.5', price: 'Daily essentials', image: null, tag: 'Daily stop' },
  { id: 'appliance-1', name: 'Sader Home', category: 'Home appliances', area: 'Abbasieh Road · industrial row', description: 'Fans, fridges, kitchen helpers and service from a team that stays local.', hours: '08:30 – 18:30', phone: '+961 7 740 731', rating: '4.4', price: 'Service available', image: null, tag: 'Local service' },
  { id: 'appliance-2', name: 'Nour Electric', category: 'Home appliances', area: 'Tyre · city centre', description: 'Reliable home appliances, repairs and honest recommendations for new homes.', hours: '09:00 – 18:00', phone: '+961 3 443 990', rating: '4.5', price: 'Repairs', image: null, tag: 'Repairs' },
];

async function seed() {
  for (const l of listings) {
    await pool.query(
      `INSERT INTO listings (id, name, category, area, description, hours, phone, rating, price, tag, image_data, image_mime)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category, area = EXCLUDED.area,
         description = EXCLUDED.description, hours = EXCLUDED.hours, phone = EXCLUDED.phone,
         rating = EXCLUDED.rating, price = EXCLUDED.price, tag = EXCLUDED.tag,
         image_data = COALESCE(EXCLUDED.image_data, listings.image_data),
         image_mime = COALESCE(EXCLUDED.image_mime, listings.image_mime),
         updated_at = now()`,
      [l.id, l.name, l.category, l.area, l.description, l.hours, l.phone, l.rating, l.price, l.tag, l.image, l.image ? 'image/jpeg' : null]
    );
  }
  console.log(`Seeded ${listings.length} listings (with images stored in the database).`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
