# Deckucate

My daughter often asks us to test her with flashcards while she revises. Paper cards work, but it is surprisingly hard to shuffle them properly, and rather easy to peek at the answer. She also wanted help hearing how Spanish words and answers are pronounced.

I made Deckucate to make that little revision ritual easier. She picks a deck, sees the cards in a random order, taps to reveal an answer, and can hear the text spoken aloud. It works on her phone, but we can also use it together on a laptop.

The name is a simple play on words: **deck**, as in a deck of cards, and **educate**.

I wanted something I could build in a weekend and keep running without the usual work of operating an app. A deck is just a two-column CSV file that we can edit in a spreadsheet. The app is a static website that can live on GitHub Pages and be added to a phone's Home Screen. There is no backend, account, database to administer, or hosting bill for an application server.

The cards stay on the device where they are imported. Deckucate saves a local copy so she can return to a deck without choosing the file every time. It does not upload her revision material, and there is no login or account to manage. We keep the original CSV files ourselves, which also makes them easy to edit or move to another device.

## Make a deck

Create a CSV with two columns. The column headings become the names of the two sides of each card:

```csv
Spanish [es-ES],English [en-GB]
la ventana,the window
"¿Dónde, exactamente?","Where, exactly?"
```

The language codes in square brackets help the browser choose a voice for each side. They are optional, and the languages can be changed in the app. Questions and longer answers work as well as single words. Save the file as UTF-8 CSV, then choose **Add deck** in Deckucate. The included `sample-spanish.csv` is a starting point.

Edit your original CSV outside the app. To bring changes into a saved deck, open its settings and choose **Refresh from CSV**. A saved deck is a local copy, not a live link to the file. Removing it from the app leaves the original file alone.

## Run it

The files in this folder can be served directly as a static website. For local development, run `python3 -m http.server 8000` here and open `http://localhost:8000/`.

To publish, put these files at the root of a GitHub repository and enable GitHub Pages for the `main` branch and root folder. The app has no build step. HTTPS from GitHub Pages allows it to be installed and used offline after it has loaded. When publishing a new version, increase the cache version in `sw.js` so installed copies can pick up the update.

The small Web Awesome interface bundle is included in `vendor/compact/`; its MIT licence is in `vendor/webawesome-LICENSE.md`.
