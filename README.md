# Deckucate

Deckucate is a simple, private flashcard app for revision and learning. Choose a CSV file containing questions and answers, then work through the cards in a random order. It works on phones and desktop browsers and can be installed as a progressive web app.

The app is deliberately small. There is no account, login, shared database, or server for children's revision material. The CSV files belong to you, and decks you choose are saved in your browser on that device. Deckucate does not upload cards or send them to a translation service. It can be hosted as a static site on GitHub Pages.

## Features

- Multiple decks from your own CSV files.
- Randomised revision sessions with a choice of which side to show first.
- Tap or click a card to reveal its other side; swipe or use the controls to move forwards and backwards.
- Text-to-speech with a language for each side and an adjustable voice speed.
- Light and dark themes, with the device setting used by default.
- Local storage for decks and offline use after the app has loaded.
- Responsive layout for phones, tablets, and desktop screens.

## Decks and cards

A **deck** is a collection of cards imported from one CSV file. Each row after the headings is a **card** with a front and a back. A **revision session** presents every card in the deck once in a random order. You can choose either side as the starting side, flip a card to check the answer, revisit the previous card, and start another shuffled session when you finish.

The cards keep a consistent size as you move through a session. Longer content scales down; **Read full card** opens text that needs more room.

## CSV format

Create a two-column CSV with headings in the first row. Both columns must contain text for every card. The headings become the labels for the two sides:

```csv
Spanish [es-ES],English [en-GB]
la ventana,the window
"¿Dónde, exactamente?","Where, exactly?"
```

You can also use questions and answers in the same language:

```csv
Spanish question [es-ES],Spanish answer [es-ES]
¿Puedes describirte?,"Tengo los ojos azules y el pelo castaño y liso."
```

The optional language codes in square brackets set the default speech language for each side. You can change these in **Deck settings**. Export the file as UTF-8 CSV from a spreadsheet. Quote a value if it contains a comma or line break; write a quote inside a value as two quotes (`""`). The included `sample-spanish.csv` and `sample-biology.csv` show the format.

CSV files are maintained outside Deckucate. To update a deck, edit the original file and use **Refresh from CSV** in the app. The current format has two columns; it does not include a separate translation field.

## Using Deckucate

1. Open the app and choose a CSV file. On a device with Google Drive, OneDrive, or another file provider in its file picker, you can select a file there too.
2. Check the deck settings and choose which side should appear first.
3. Select **Start revision**. Tap or click to flip; use **Next card** and **Previous card**, swipe right and left respectively, or use the arrow keys on a keyboard.
4. After the last card, choose **Revise again** for another random order.

Choosing an already saved deck starts a new session immediately. Use the settings control beside a deck to change the starting side, speech languages, or voice speed before revising. The appearance icon in the header switches between light and dark after you override the device setting.

## Local storage and privacy

Deckucate reads a selected CSV in the browser and saves a copy of the deck in IndexedDB on that device. It does not connect to a storage account or automatically sync changes. **Remove deck** deletes the saved copy from Deckucate; it does not delete the original CSV. Browser storage can be cleared by the user or device, so keep the original files elsewhere.

The app's files are downloaded from the static host, and the browser caches them for offline use. Card content stays in the browser: Deckucate has no account, backend, analytics, or translation service. If you select a CSV through a cloud file provider, that provider manages the original file; Deckucate still reads and stores its own local copy. An app installed on an iPhone's Home Screen may have storage separate from Safari, so choose the CSV in the installed app as well.

## Running locally

Serve the project folder over HTTP. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. Service workers do not run from `file://`.

## Hosting

Place the contents of this folder at the root of a GitHub repository. In the repository settings, enable GitHub Pages from the `main` branch and the root (`/`) folder. GitHub Pages supplies HTTPS, which the installable and offline features require. The paths are relative, so a project site such as `https://username.github.io/deckucate/` works without changing the app.

There is no application build step or backend to deploy. The small set of Web Awesome components used by the interface is bundled in `vendor/compact/` and served with the app, without a CDN. Web Awesome Core is MIT licensed; see `vendor/webawesome-LICENSE.md`. To upgrade those components or add more, regenerate the vendor bundle.

### Updating an installed app

Increase the cache version at the top of `sw.js` whenever you publish changes. While online, Deckucate checks for updates when it opens and when you return to it. Once the new files are ready, **Update now** appears on the deck list or finish page; selecting it reloads the app. It waits until the session is over to show the notice. Locally saved decks remain in browser storage. The first upgrade from an older release may need one manual reload to pick up this update control.

## Checks

```bash
node --test deck.test.mjs
```
