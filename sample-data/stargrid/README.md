# StarGrid sample data (optional)

StarGrid is a fictional technology company: fiber internet, networking, compute, storage, and AI. Deploy this folder if you want a working card library on day one instead of building cards from scratch.

| Item | What it does |
| --- | --- |
| `FinCardSeeder` | About 55 starter cards (products, fiber plans, support guides, self-service actions). Also gives the AI card generator StarGrid's brand, site pages, and product images. |
| `StarGrid_Heroku_Images` CSP trusted site | Lets the card images (hosted on the StarGrid demo site) load in Experience Cloud and in the studio. |
| `experience/sdo-consumer-ask-fin` | Reference only: the Experience Builder route and view JSON for the "Ask Fin" page used in the original demo. It is not deployed. |

Deploy it after the core package:

```sh
sf project deploy start -d sample-data/stargrid -o <alias>
```

Then load the cards from **Fin Card Studio, Library, Add starter cards**, or run this anonymous Apex:

```sh
echo "System.debug(FinCardSeeder.seed());" | sf apex run -o <alias>
```

Seeding is idempotent: it only creates cards whose names do not exist yet.

The starter cards link to the public StarGrid demo site. Your Fin workspace answers from its own content, so cards appear when Fin's answer or the visitor's message matches the card keywords. If you want Fin to answer about StarGrid too, add `https://stargrid-service-demo-721e32a56364.herokuapp.com/knowledge/` as a public website content source in Fin.

To use your own brand instead, set **Brand Name** and **Site Base URL** in Fin Agent Settings; those values override the sample for the AI card generator.

To remove the sample, delete the starter cards, then delete `FinCardSeeder`, `FinCardSeederTest`, and the CSP trusted site.
