# Deckucate

Deckucate is a simple, private flashcard app for revision and learning. Choose a CSV file containing questions and answers, then work through the cards in a random order. It works on phones and desktop browsers and can be installed as a progressive web app.

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