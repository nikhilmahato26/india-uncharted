# Running your website

This is for whoever looks after indiauncharted.com day to day. It assumes no technical background. You don't need a developer for anything in this guide.

**Two things to know first.**

1. Everything you change in the admin panel is safe, and it appears on the live site within seconds. If something looks wrong, change it back — nothing is lost.
2. Never ask anyone to "edit the database directly". Everything on the site has a screen in the admin panel, and that screen keeps the site consistent.

---

## Signing in

Go to **indiauncharted.com/admin** and sign in with your email and password.

Change your password the first time you sign in: **Your account** in the bottom-left corner. Changing your password signs you out on every other device, which is exactly what you want if a laptop ever goes missing.

If you forget your password, ask a super admin to set a new one for you (Users → Reset password).

---

## The menu, screen by screen

### Dashboard

Where you land. New enquiries, what's live, what still needs attention, and what changed recently. The "Needs attention" list is the shortest path to a tidy site.

### Enquiries

Every enquiry from the website. Open one and you get the traveller's details, what they asked about, and buttons to reply by WhatsApp, phone or email — already filled in with their name and reference.

Move each enquiry along its **stage** as you work it: New → Contacted → Quoted → Confirmed → Completed, or Lost. Add **notes** so whoever picks it up next knows what was said. Travellers never see the notes.

Once your email details are set up, an email also goes out to you the moment an enquiry arrives, so you don't have to watch this screen. Until then, check here — nothing is lost either way.

### Homepage

Every block of the homepage, in the order visitors see them.

- **Edit** opens a block: its headline, text, photograph, buttons and where they link. Only the things that actually change the page are there.
- For **Discover India** you choose the places yourself — the first is the large photograph. Only published places that have a photograph can be picked.
- The **arrows** move a block up or down. The **Shown / Hidden** switch takes it off the page without deleting it.
- **Add a section** puts a new block at the bottom, hidden, so a half-finished one never appears on the site. Fill it in, then switch it on.
- Links can go to a page on the site (starting with `/`) or a full `https://` address — nothing else is accepted.
- The background colours aren't editable. They're set so neighbouring sections never clash.

Changes appear on the site as soon as you save. Editors can change words and pictures; moving, hiding and adding blocks needs an Admin.

### Destinations

Every place you plan journeys through. Each one becomes a travel-guide page.

- **Name** is what travellers call it. **Byline** is the epithet, like "The Blue City".
- **URL** is the web address. Change it and the old address keeps working automatically — a redirect is created for you.
- Fill in **Best time**, **How to reach** and **Travel tips** honestly. Specific beats general: a traveller can tell the difference.
- **Beyond the obvious** puts the place in the offbeat section on the homepage.

### Regions

The groups destinations belong to. A region only appears on the site once it has published destinations, so a region you're not selling yet stays hidden.

### Journeys

Your multi-day routes, retreats, courses and motorcycle expeditions. Motorcycle journeys automatically live under /bike-tours.

- **Highlights**, **What's included** and **Not included** take one line each.
- **Quote only** is on by default and shows "Price on request". Only switch it off if you're genuinely happy to publish a starting price.
- Don't name a hotel unless the stay is actually confirmed — write the standard of accommodation instead.

### Experiences

Half-day and full-day things: walks, food trails, cycle rides, the desert evening. Each one can be attached to a destination, which is how it appears on that destination's page.

### Travel guide

Guides and journal entries. Both live under /travel-guide. The **excerpt** is what shows on cards and, if you leave the SEO description empty, in Google.

### Services

Transfers, and anything else you offer alongside journeys. The fleet lives here.

### Pages

About, Contact, Plan My Journey, and the legal pages.

- **Privacy Policy, Terms & Conditions and Cookie Policy** are drafts until you paste in your approved text and switch them to Published. The moment one is published *with text in it*, it appears at its address (for example `/privacy-policy`), gets a link in the footer and is added to the sitemap. A policy published with nothing in it stays hidden, so there's never an empty legal page. The "Last updated" date on the page is the date you last saved it.
- These pages, and About, Contact and Plan My Journey, have **fixed addresses** — the URL field can't be changed for them, because the site is built around those addresses.

### FAQs

Questions and answers you can attach to any destination, journey or page. Write the question the way a traveller would ask it, and answer it properly: that answer is what search engines read.

### Guest stories

Reviews. **A story cannot be published until someone ticks the verification box** — confirming it's a real guest who agreed to it being published. This is deliberate. The two stories imported from the old site are unverified, so they're not showing.

### Media

Every image on the site.

- **Alt text** describes the picture for blind visitors and for search engines. "Camels crossing a dune at sunset near Jaisalmer" — not "image1". The library shows you which images are still missing it.
- **Licence** is a promise that you have the right to publish the image. Images brought over from the old site are marked "not confirmed" until you say otherwise.
- An image used on a page can't be deleted until you replace it there — so nothing ever disappears from a live page by accident.

### SEO manager

- **Defaults** and **title patterns** decide how titles read when a page doesn't set its own. `{name}` is replaced by the page's name.
- **Verification and analytics** take only the code each service gives you (like `G-XXXXXXX`), never a whole script.
- **Cookie consent.** Once you add a Google Analytics, Tag Manager or Meta Pixel code, visitors to the live site see a small "Cookies, briefly" notice naming exactly what you use. Nothing is loaded for a visitor until they press Accept; Decline is just as easy. Their choice is remembered for six months, and a **Cookie settings** link in the footer lets anyone change their mind. Browsers that send a privacy signal are treated as having declined. Analytics never runs on the preview site, so your own testing won't skew the numbers. Publish your Cookie Policy page and the notice links to it automatically.
- **Health report** lists every published page with what's missing.
- **Keywords** shows what each page is trying to be found for, and warns when two pages chase the same phrase — which splits your traffic between them.
- **Redirects** keeps old addresses working. Every address from the old WordPress site is already in here.

Each page also has its own **SEO tab**, with a Google preview and a list of checks. Those checks are advice, not a score, and nothing on this site promises a ranking.

### Seasonal notices

For when something can't be travelled: a monsoon, a closed pass, an off-season. Write the notice now, switch it on when it applies, switch it off after. A notice on one journey never appears anywhere else.

### Site settings

Your business details — phone, email, address, social links, logo. These feed the header, the footer, the contact page and the information search engines read about you.

**WhatsApp:** the WhatsApp buttons across the site appear only once you put a number in the WhatsApp field. It's empty right now because nobody has confirmed that +91 80059 67178 is on WhatsApp.

### Activity

Who changed what, and when. Useful when something looks different and nobody remembers touching it.

### Users

Who can sign in.

- **Editor** writes and edits, but can't publish or delete.
- **Admin** does everything with content, enquiries, redirects and settings.
- **Super admin** also manages users and the verification codes.

Give people the smallest role that lets them do their job.

---

## How editing works

1. Open the thing you want to change.
2. Edit it. **Save** keeps your changes.
3. **Preview** opens the real page with your unpublished changes visible — only you see it.
4. **Status** decides whether it's live: Draft (nobody sees it), Published (live), Archived (retired, kept for the record).

The **publish switch** in a list takes effect immediately. A **checkbox inside a form** waits for you to press Save. That difference is deliberate throughout.

---

## Things the site will not let you do

These are on purpose, and each one protects you:

- Publish a guest story nobody has verified.
- Delete an image that's still on a page.
- Publish a page while signed in as an Editor.
- Save a web address that's already in use, or one the site itself needs.
- Create a redirect loop.
- Show a price where none has been set — it says "Price on request" instead.

---

## Before the new site goes live

A short list that needs you, not a developer:

1. **Confirm the logo** and send the original file (a vector, `.svg` or `.ai`).
2. **Say whether +91 80059 67178 is on WhatsApp.**
3. **Verify the two guest stories**, or send us real reviews to use.
4. **Confirm the claims** currently held back: "24/7 support", "strong hospitality partnerships", "sustainable and responsible travel practices", and the transfers page's "100% Verified".
5. **Confirm two place names** we corrected: Jispa (the old site said "jaispa") and Khichan ("khivhan").
6. **Photography:** confirm you have the right to publish the images brought over from the old site. Five of them have filenames suggesting they were AI-generated — those should be replaced with real photographs of the real places.
7. **Nine photographs are doing two jobs.** The same picture stands for two different pages, so a visitor sees Jodhpur's food walk and Jodhpur's city tour under one image. Send one photograph per page for these:
   - the Jaisalmer AI image, used on the two yoga courses, the Golden City journey and the Jaisalmer sightseeing day
   - the two wellness AI images, used on four journal articles between them
   - Agra (place) and the Agra walking tour · Gulmarg and the Kashmir Paradise journey
   - Incredible India and the Educational Group journey · Spiritual India and the Goa yoga article
   - Udaipur's two walking tours · Jodhpur's two walking tours
   Until then each page still shows a real photograph — just not one of its own.
8. **Two journey photographs are not photographs of journeys:** a car brochure shot and two contact-sheet collages. They break the frame the rest of the site keeps.
9. **Facts for each destination.** None of the 35 place pages say when to go, how to get there or how long to stay — the old site never did. Send these in your own words and they'll appear in each page's fact strip. We haven't guessed them: October to March suits a desert tour, not a tiger reserve that closes in the monsoon.
10. **A few lines for pages that have no words of their own:** the 6 region pages, 17 travel-style and experience pages, and 15 places with no introduction (Jaipur, Srinagar, Rishikesh, Pahalgam, Sonamarg, Sariska, Chandigarh, Nubra Valley, Pangong Lake, Jispa, Sarchu, Tal Chhapar, Khichan, Yusmarg, Doodhpathri).
11. **One sentence is wrong on the Kashmir Nature & Relaxation Family Tour.** Its best-time text ends "comfortable for sightseeing and desert activities" — copied from the Jaisalmer tour on the old site. Edit it under Journeys → that tour → Best time.
12. **Pages competing with each other in Google.** Decide whether to merge, rename or keep:
    - the 200 Hour Yoga Teacher Training Course and the Rishikesh Yoga Teacher Training Tour — both 28 days in Rishikesh
    - the two travel-guide articles "Yoga Holiday in India… in Goa" and "Why a Yoga Holiday in Goa…"
    - the 6-day and 7-day Kashmir honeymoon packages, which now show the same name. Calling the 7-day one "Kashmir Honeymoon Package with Sonamarg" would match its route.
13. **Better photos already in your library** — your choice, nothing has been swapped:
    - Jaipur Cycle Tour: there's a photo of a cyclist in front of the Hawa Mahal, instead of cyclists on a country lane
    - Gulmarg: a real photo of the Gulmarg gondola, instead of the purple-sky one
    - Amritsar: the Golden Temple, instead of the border ceremony
    - The article "Why a Yoga Holiday in Goa…" currently shows a photo taken in Varanasi
14. **Old website graphics you can delete** from Media: two banners with "Crafted Journeys, Unforgettable Memories" written on them, a clip-art suitcase, three tiny icons, a patterned background and a world-map background. None is used anywhere.
15. **Write the legal pages** (Privacy, Terms, Cookies), or send us approved text.
16. **Audit the old WordPress users.** There's an account called `saragamhospitaludaipur` with author access to your current site.

---

## If something goes wrong

- **A page looks broken.** Check whether it's Draft. If it is, that's the site doing its job.
- **A change isn't showing.** Reload. If it still isn't there, check you pressed Save and that the status is Published.
- **You deleted something by mistake.** Tell your developer before adding it again — the activity log records what it was.
- **Enquiries stop arriving by email.** They're still being saved; check the Enquiries screen, and ask your developer to check the email settings.
